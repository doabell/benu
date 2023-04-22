import React from "react";

const PWAHeaders: React.FC = () => {
  return (
    <>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/apple-touch-icon.png"
      />
      <link rel="icon" type="image/svg+xml" href="favicon.svg" />
      <link rel="icon" type="image/png" href="favicon.png" />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#022543" />
      <meta
        name="apple-mobile-web-app-status-bar-style"
        content="black-translucent"
      />
      <meta name="apple-mobile-web-app-title" content="Benu" />
      <meta name="application-name" content="Benu" />
      <meta name="description" content="Menu, but better" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="msapplication-TileColor" content="#2b5797" />
      <meta name="theme-color" content="#022543" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Benu" />
      <meta property="og:description" content="Menu, but better" />
      <meta property="og:site_name" content="Benu" />
      <meta property="og:url" content="https://benu.vercel.app/" />
      <meta
        property="og:image"
        content="https://benu.vercel.app/apple-touch-icon.png"
      />
    </>
  );
};

export default PWAHeaders;
