import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '#lib/server/db/index.ts';
import { links, apiKeys, type NewLink } from '#lib/server/db/schema.ts';
import { linkCache } from '#lib/server/cache.ts';
import { authenticateApiRequest } from '#lib/server/api-auth.ts';
import { RESERVED_PATHS } from '#lib/server/resolver.ts';
import { eq, desc, and } from 'drizzle-orm';

/**
 * Native Model Context Protocol (MCP) Server Endpoint (/api/mcp)
 * Enables external AI coding assistants and agents to manage Run links programmatically.
 */

interface JsonRpcRequest {
	jsonrpc: '2.0';
	id?: string | number;
	method: string;
	params?: Record<string, any>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	let rpcReq: JsonRpcRequest;
	try {
		rpcReq = await request.json();
	} catch {
		return json(
			{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
			{ status: 400 }
		);
	}

	const { method, params = {}, id = 1 } = rpcReq;

	// Require valid authentication for all MCP operations
	const auth = await authenticateApiRequest(request, locals);
	if (!auth.authenticated) {
		return json(
			{
				jsonrpc: '2.0',
				id,
				error: { code: -32000, message: auth.error || 'Authentication required. Pass valid Bearer token.' }
			},
			{ status: 401 }
		);
	}

	// 1. Tool Listing method
	if (method === 'tools/list') {
		return json({
			jsonrpc: '2.0',
			id,
			result: {
				tools: [
					{
						name: 'create_link',
						description: 'Create a new short link with routing rules, delivery security, and UTMs',
						inputSchema: {
							type: 'object',
							properties: {
								destinationUrl: { type: 'string', description: 'Destination web URL' },
								slug: { type: 'string', description: 'Custom short slug (optional)' },
								title: { type: 'string', description: 'Link title' },
								deliveryMode: {
									type: 'string',
									enum: ['direct', 'password', 'age_gate', 'interstitial', 'cloaked', 'reverse_proxy'],
									description: 'Delivery mode / security gate'
								},
								maxClicks: { type: 'number', description: 'Expiration click threshold' },
								tags: { type: 'array', items: { type: 'string' } }
							},
							required: ['destinationUrl']
						}
					},
					{
						name: 'list_links',
						description: 'List active short links in the workspace',
						inputSchema: {
							type: 'object',
							properties: {
								limit: { type: 'number', description: 'Number of links to return (default 20)' }
							}
						}
					},
					{
						name: 'get_link',
						description: 'Get details and real-time click statistics for a short link by slug or ID',
						inputSchema: {
							type: 'object',
							properties: {
								slug: { type: 'string', description: 'Short slug to query' }
							},
							required: ['slug']
						}
					},
					{
						name: 'check_link_health',
						description: 'Verify if a destination URL is online and reachable (HTTP status check)',
						inputSchema: {
							type: 'object',
							properties: {
								url: { type: 'string', description: 'URL to check' }
							},
							required: ['url']
						}
					}
				]
			}
		});
	}

	// 2. Tool Execution method
	if (method === 'tools/call') {
		const toolName = params.name;
		const args = params.arguments || {};

		switch (toolName) {
			case 'create_link': {
				const dest = args.destinationUrl;
				if (!dest) {
					return json({
						jsonrpc: '2.0',
						id,
						error: { code: -32602, message: 'Missing destinationUrl' }
					});
				}

				let slug = (args.slug || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
				if (!slug) {
					slug = Math.random().toString(36).substring(2, 8);
				}

				if (RESERVED_PATHS.has(slug)) {
					return json({
						jsonrpc: '2.0',
						id,
						result: {
							isError: true,
							content: [{ type: 'text', text: `Slug "${slug}" is a reserved system path and cannot be used.` }]
						}
					});
				}

				// Check collision
				const existing = await db
					.select({ id: links.id })
					.from(links)
					.where(eq(links.slug, slug))
					.limit(1);

				if (existing.length > 0) {
					return json({
						jsonrpc: '2.0',
						id,
						result: {
							isError: true,
							content: [{ type: 'text', text: `Slug "${slug}" already exists.` }]
						}
					});
				}

				const org = await db.query?.organization?.findFirst?.();
				const workspaceId = auth.workspaceId || org?.id || 'default-workspace';

				const [created] = await db
					.insert(links)
					.values({
						workspaceId,
						slug,
						destinationUrl: dest,
						title: args.title || null,
						deliveryMode: args.deliveryMode || 'direct',
						maxClicks: args.maxClicks || null,
						tags: args.tags ? JSON.stringify(args.tags) : null
					})
					.returning();

				await linkCache.invalidate(null, slug);

				return json({
					jsonrpc: '2.0',
					id,
					result: {
						content: [
							{
								type: 'text',
								text: JSON.stringify(
									{
										message: 'Link created successfully',
										shortUrl: `/${created.slug}`,
										link: created
									},
									null,
									2
								)
							}
						]
					}
				});
			}

			case 'list_links': {
				const limit = args.limit || 20;
				const allLinks = await db
					.select()
					.from(links)
					.where(eq(links.isArchived, false))
					.orderBy(desc(links.createdAt))
					.limit(limit);

				return json({
					jsonrpc: '2.0',
					id,
					result: {
						content: [{ type: 'text', text: JSON.stringify(allLinks, null, 2) }]
					}
				});
			}

			case 'get_link': {
				const slug = args.slug;
				const [link] = await db.select().from(links).where(eq(links.slug, slug)).limit(1);

				if (!link) {
					return json({
						jsonrpc: '2.0',
						id,
						result: {
							isError: true,
							content: [{ type: 'text', text: `Link with slug "${slug}" not found.` }]
						}
					});
				}

				return json({
					jsonrpc: '2.0',
					id,
					result: {
						content: [{ type: 'text', text: JSON.stringify(link, null, 2) }]
					}
				});
			}

			case 'check_link_health': {
				const target = args.url;
				try {
					const controller = new AbortController();
					const timeout = setTimeout(() => controller.abort(), 4000);
					const res = await fetch(target, { method: 'HEAD', signal: controller.signal });
					clearTimeout(timeout);

					return json({
						jsonrpc: '2.0',
						id,
						result: {
							content: [
								{
									type: 'text',
									text: JSON.stringify({
										url: target,
										reachable: res.ok,
										status: res.status,
										statusText: res.statusText
									})
								}
							]
						}
					});
				} catch (err: any) {
					return json({
						jsonrpc: '2.0',
						id,
						result: {
							content: [
								{
									type: 'text',
									text: JSON.stringify({
										url: target,
										reachable: false,
										error: err.message || 'Connection timed out or failed'
									})
								}
							]
						}
					});
				}
			}

			default:
				return json({
					jsonrpc: '2.0',
					id,
					error: { code: -32601, message: `Tool "${toolName}" not found.` }
				});
		}
	}

	return json({
		jsonrpc: '2.0',
		id,
		error: { code: -32601, message: `Method "${method}" not implemented.` }
	});
};

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-run-client'
		}
	});
};
