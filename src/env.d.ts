declare const process: {
	env: {
		API_URL: string;
		GATEWAY_URL: string;
	};
};

declare module '*.ftl?raw' {
	const content: string;
	export default content;
}
