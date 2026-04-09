import '../styles/globals.css';
import 'bulma/css/bulma.min.css';
import '../styles/overrides.css';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/languages/python.min.js" strategy="beforeInteractive" />
      <Component {...pageProps} />
    </>
  );
}
