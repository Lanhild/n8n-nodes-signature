import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	IPollFunctions,
	NodeApiError,
} from 'n8n-workflow';

import moment from 'moment-timezone';

import jwt from 'jsonwebtoken';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	let options: OptionsWithUri = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${endpoint}`,
		qsStringifyOptions: {
			arrayFormat: 'repeat',
		},
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		let credentialType = 'gmailOAuth2';
		const authentication = this.getNodeParameter('authentication', 0) as string;

		if (authentication === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');
			credentialType = 'googleApi';

			const { access_token } = await getAccessToken.call(this, credentials);

			(options.headers as IDataObject).Authorization = `Bearer ${access_token}`;
		}

		const response = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
		);
		return response;
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		if (error.httpCode === '400') {
			if (error.cause && ((error.cause.message as string) || '').includes('Invalid id value')) {
				const resource = this.getNodeParameter('resource', 0) as string;
				const errorOptions = {
					message: `Invalid ${resource} ID`,
					description: `${
						resource.charAt(0).toUpperCase() + resource.slice(1)
					} IDs should look something like this: 182b676d244938bd`,
				};
				throw new NodeApiError(this.getNode(), error, errorOptions);
			}
		}

		if (error.httpCode === '404') {
			let resource = this.getNodeParameter('resource', 0) as string;
			if (resource === 'signature') {
				resource = 'email Address';
			}
			const errorOptions = {
				message: `${resource.charAt(0).toUpperCase() + resource.slice(1)} not found`,
				description: '',
			};
			throw new NodeApiError(this.getNode(), error, errorOptions);
		}

		if (error.code === 'EAUTH') {
			const errorOptions = {
				message: error?.body?.error_description || 'Authorization error',
				description: (error as Error).message,
			};
			throw new NodeApiError(this.getNode(), error, errorOptions);
		}

		if (
			((error.message as string) || '').includes('Bad request - please check your parameters') &&
			error.description
		) {
			const errorOptions = {
				message: error.description,
				description: '',
			};
			throw new NodeApiError(this.getNode(), error, errorOptions);
		}

		throw new NodeApiError(this.getNode(), error, {
			message: error.message,
			description: error.description,
		});
	}
}

async function getAccessToken(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	credentials: ICredentialDataDecryptedObject,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/gmail.labels',
		'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
		'https://www.googleapis.com/auth/gmail.addons.current.message.action',
		'https://mail.google.com/',
		'https://www.googleapis.com/auth/gmail.modify',
		'https://www.googleapis.com/auth/gmail.compose',
		'https://www.googleapis.com/auth/gmail.settings.sharing',
		'https://www.googleapis.com/auth/gmail.settings.basic',
	];

	const now = moment().unix();

	credentials.email = (credentials.email as string).trim();
	const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();

	const signature = jwt.sign(
		{
			iss: credentials.email,
			sub: credentials.delegatedEmail || credentials.email,
			scope: scopes.join(' '),
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600,
		},
		privateKey,
		{
			algorithm: 'RS256',
			header: {
				kid: privateKey,
				typ: 'JWT',
				alg: 'RS256',
			},
		},
	);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signature,
		},
		uri: 'https://oauth2.googleapis.com/token',
		json: true,
	};

	return this.helpers.request(options);
}

export function unescapeSnippets(items: INodeExecutionData[]) {
	const result = items.map((item) => {
		const snippet = item.json.snippet as string;
		if (snippet) {
			item.json.snippet = snippet.replace(/&amp;|&lt;|&gt;|&#39;|&quot;/g, (match) => {
				switch (match) {
					case '&amp;':
						return '&';
					case '&lt;':
						return '<';
					case '&gt;':
						return '>';
					case '&#39;':
						return "'";
					case '&quot;':
						return '"';
					default:
						return match;
				}
			});
		}
		return item;
	});
	return result;
}