import React, { useEffect } from "react";
import Head from "next/head";
import type { AppProps } from "next/app";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CacheProvider, EmotionCache } from "@emotion/react";
import roboto from "../material/theme";
import createEmotionCache from "../material/createEmotionCache";
import { Box, CssBaseline, Container, Typography, Link, useMediaQuery } from "@mui/material";

function Copyright(props: any) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {"We're no "}
      <Link color="inherit" href="https://www.youtube.com/watch?v=doEqUhFiQS4">
        strangers to love
      </Link>
      {"."}
    </Typography>
  );
}


// Client-side cache, shared for the whole session of the user in the browser.
const clientSideEmotionCache = createEmotionCache();

export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}


export default function MyApp(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const [mode, setMode] = React.useState<"light" | "dark">("light");
  const colorMode = React.useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
      },
    }),
    [],
  );

  useEffect(() => {
    setMode(prefersDarkMode? "dark" : "light");
  }, [prefersDarkMode]);

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
        typography: {
          fontFamily: roboto.style.fontFamily,
        },
      }),
    [mode],
  );
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
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
              <Typography component="h1" variant="h2" align="center">Benu</Typography>
              <Typography component="p" className="tagline" align="center">Menu, but better</Typography>
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