import React, { useEffect } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";
import { CacheProvider, EmotionCache } from "@emotion/react";
import roboto from "../material/theme";
import createEmotionCache from "../material/createEmotionCache";
import {
  Box,
  CssBaseline,
  Container,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { Copyright } from "../components/Copyright";

import { useLocalStorageValue } from "@react-hookz/web";

// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const dark = useLocalStorageValue("dark", {
    defaultValue: prefersDarkMode ? "dark" : "light",
    initializeWithValue: false,
  });
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        dark.set((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    [dark]
  );

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: dark.value as PaletteMode,
        },
        typography: {
          fontFamily: roboto.style.fontFamily,
        },
      }),
    [dark]
  );
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="favicon.svg" />
        <link rel="icon" type="image/png" href="favicon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#022543" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
        <meta property="og:image" content="https://benu.vercel.app/apple-touch-icon.png" />
        <title>Benu</title>
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <main>
          <header>
            <Box
              sx={{
                marginTop: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <Typography component="h1" variant="h3" align="center">
                Benu
              </Typography>
              <Typography component="p" className="tagline" align="center">
                Menu, but better
              </Typography>
            </Box>
          </header>
          <Container maxWidth="xl">
            <Component {...pageProps} colorMode={colorMode} />
          </Container>
        </main>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </ThemeProvider>
    </CacheProvider>
  );
}
