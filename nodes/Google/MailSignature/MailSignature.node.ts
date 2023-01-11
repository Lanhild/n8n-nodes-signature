import { INodeTypeBaseDescription, IVersionedNodeType, VersionedNodeType } from 'n8n-workflow';

import { MailSignature } from './v1/MailSignature.node';

export class Gmail extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Mail Signature',
			name: 'mailSignature',
			icon: 'file:v1/mailSignature.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume the Gmail API to set email signatures',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MailSignature(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
