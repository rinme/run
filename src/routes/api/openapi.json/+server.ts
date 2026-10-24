import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const origin = url.origin;

	const openApiSpec = {
		openapi: '3.1.0',
		info: {
			title: 'Run API',
			version: '2.4.0',
			description:
				'Link shortener and analytics API with custom domain routing, security rules, and device targeting.'
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
			'/api/links/export': {
				get: {
					summary: 'Export Links',
					description: 'Export links in Run Native format or Sink v1.0 compatible format',
					parameters: [
						{ name: 'format', in: 'query', schema: { type: 'string', enum: ['run', 'sink'], default: 'run' } },
						{ name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'active', 'expired'], default: 'all' } }
					],
					responses: {
						'200': { description: 'Exported JSON file attachment' }
					}
				}
			},
			'/api/links/import': {
				post: {
					summary: 'Import & Migrate Links',
					description: 'Import links from Run or Sink v1.0 export files with slug collision resolution and domain remapping',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['payload'],
									properties: {
										payload: { type: 'object', description: 'Exported JSON object or array' },
										format: { type: 'string', enum: ['auto', 'run', 'sink'], default: 'auto' },
										conflictStrategy: { type: 'string', enum: ['skip', 'overwrite', 'rename'], default: 'skip' },
										targetDomainId: { type: 'string' },
										remapDomainUrl: { type: 'string' },
										useOriginDomain: { type: 'boolean', default: false }
									}
								}
							}
						}
					},
					responses: {
						'200': { description: 'Import result summary with counts and logs' }
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
