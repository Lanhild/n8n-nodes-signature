/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { IExecuteFunctions } from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { googleApiRequest, unescapeSnippets } from '../GenericFunctions';

import { signatureFields, signatureOperations } from './SignatureDescription';

const versionDescription: INodeTypeDescription = {
	displayName: 'Mail Signature',
	name: 'mailSignature',
	icon: 'file:mailSignature.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Gmail API to set an email signature',
	defaults: {
		name: 'mailSignature',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'googleApi',
			required: true,
			displayOptions: {
				show: {
					authentication: ['serviceAccount'],
				},
			},
		},
		{
			name: 'gmailOAuth2',
			required: true,
			displayOptions: {
				show: {
					authentication: ['oAuth2'],
				},
			},
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'OAuth2 (recommended)',
					value: 'oAuth2',
				},
				{
					name: 'Service Account',
					value: 'serviceAccount',
				},
			],
			default: 'oAuth2',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Signature',
					value: 'signature',
				},
			],
			default: 'signature',
		},
		...signatureOperations,
		...signatureFields,
	],
};

export class MailSignatureV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {
				//------------------------------------------------------------------//
				//						 	signature								//
				//------------------------------------------------------------------//
				if (resource === 'signature') {
					if (operation === 'set') {
						//https://gmail.googleapis.com/gmail/v1/users/email/settings/sendAs/email
						const email = this.getNodeParameter('email', i);
						const endpoint = `/gmail/v1/users/${email}/settings/sendAs/${email}`;
						const signatureBody = this.getNodeParameter('sigValue', i) as string[];

						const body = {
							signature: signatureBody,
							sendAs: email,
						};

						responseData = await googleApiRequest.call(this, 'PATCH', endpoint, body);
					}
				}
				//------------------------------------------------------------------//

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{
						itemData: { item: i },
					},
				);
				returnData.push(...executionData);
			} catch (error) {
				error.message = `${error.message} (item ${i})`;
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, {
					description: error.description,
					itemIndex: i,
				});
			}
		}
		if (['signature'].includes(resource) && ['get'].includes(operation)) {
			return this.prepareOutputData(unescapeSnippets(returnData));
		}
		return this.prepareOutputData(returnData);
	}
}
