import adapter from '@sveltejs/adapter-static';
//import { vitePreprocess } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consultez https://kit.svelte.dev/docs/integrations#preprocessors
	// pour plus d'informations sur les préprocesseurs
	preprocess: vitePreprocess(),

	kit: {
		// On utilise l'adaptateur statique que nous venons d'installer.
		// C'est cette partie qui est cruciale pour le mode hors ligne.
		adapter: adapter({
			// Options par défaut pour une PWA.
			// 'fallback: '200.html'' est souvent utilisé, mais pour commencer,
			// 'fallback: null' est plus simple et devrait fonctionner.
			// Si vous rencontrez des problèmes de rechargement de page en ligne,
			// nous pourrons le changer en '200.html' ou 'index.html'.
			fallback: null,
			pages: 'build',
			assets: 'build',
			precompress: false,
			strict: true
		})
	}
};

export default config;
