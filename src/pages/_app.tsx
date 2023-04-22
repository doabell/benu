import React from "react";
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
import Copyright from "@/components/Copyright";
import PWAHeaders from "@/components/PWAHeaders";

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
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <Head>
          <PWAHeaders />
          <title>Benu</title>
        </Head>
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
        <Copyright />
      </ThemeProvider>
    </CacheProvider>
  );
}
