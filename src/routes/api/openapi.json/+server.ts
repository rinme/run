import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;

	const openApiSpec = {
		openapi: '3.1.0',
		info: {
			title: 'Run API',
			version: '2.0.0',
			description:
				'High-performance Edge Link Shortener & Analytics API with sub-10ms resolution, dynamic device/geo routing, password gates, and Tinybird stream ingestion.'
		},
		servers: [
			{
				url: origin,
				description: 'Current Environment'
			}
		],
		paths: {
			'/api/links': {
				get: {
					summary: 'List Links',
					description: 'Retrieve a list of short links in the workspace',
					responses: {
						'200': {
							description: 'Array of link objects',
							content: { 'application/json': { schema: { type: 'array' } } }
						}
					}
				},
				post: {
					summary: 'Create Short Link',
					description: 'Create a new short link with custom slug, delivery modes, and routing rules',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['destinationUrl'],
									properties: {
										destinationUrl: { type: 'string', format: 'uri' },
										slug: { type: 'string' },
										title: { type: 'string' },
										deliveryMode: {
											type: 'string',
											enum: ['direct', 'password', 'age_gate', 'interstitial', 'cloaked', 'reverse_proxy']
										},
										password: { type: 'string' },
										interstitialDuration: { type: 'integer', default: 5 },
										maxClicks: { type: 'integer' },
										expiresAt: { type: 'string', format: 'date-time' },
										redirectWithQuery: { type: 'boolean', default: true },
										deviceRouting: { type: 'object' },
										geoRouting: { type: 'object' },
										abSplits: { type: 'array' },
										utmPreset: { type: 'object' }
									}
								}
							}
						}
					},
					responses: {
						'201': { description: 'Link created successfully' },
						'409': { description: 'Slug collision' }
					}
				}
			},
			'/api/ai/suggest': {
				post: {
					summary: 'AI Slug & Summary Generator',
					description: 'Analyzes target URL via Google Gemini to generate smart slugs and metadata',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['url'],
									properties: { url: { type: 'string', format: 'uri' } }
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'AI Suggestions',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											slugs: { type: 'array', items: { type: 'string' } },
											summary: { type: 'string' },
											tags: { type: 'array', items: { type: 'string' } }
										}
									}
								}
							}
						}
					}
				}
			},
			'/api/stats/overview': {
				get: {
					summary: 'Analytics Overview',
					description: 'Fetch aggregate link counts, total clicks, and device/country breakdowns',
					responses: {
						'200': { description: 'Overview statistics' }
					}
				}
			},
			'/api/mcp': {
				post: {
					summary: 'Model Context Protocol (MCP) JSON-RPC Endpoint',
					description:
						'Native MCP Server exposing tools/list and tools/call (create_link, list_links, get_link, check_link_health)',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['jsonrpc', 'method'],
									properties: {
										jsonrpc: { type: 'string', example: '2.0' },
										method: { type: 'string', example: 'tools/list' },
										params: { type: 'object' },
										id: { type: 'integer', example: 1 }
									}
								}
							}
						}
					},
					responses: {
						'200': { description: 'JSON-RPC response' }
					}
				}
			}
		}
	};

	return json(openApiSpec);
};
