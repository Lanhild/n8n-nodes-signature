import { INodeProperties } from 'n8n-workflow';

export const signatureOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['signature'],
			},
		},

		options: [
			{
				name: 'set',
				value: 'set',
				action: 'Set a signature',
			},
		],
		default: 'set',
	},
];

export const signatureFields: INodeProperties[] = [
	{
		displayName: 'Signature value',
		name: 'sigValue',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['set'],
			},
		},
		placeholder: 'John Doe, IT Analyst',
		description: 'Email signature',
	},
	{
		displayName: 'Email address',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['signature'],
				operation: ['set'],
			},
		},
		placeholder: 'name@email.com',
		description: 'Email address you want to set a signature for',
	},
];
