import React from "react";
import Head from "next/head";
import type { AppProps } from "next/app";

import { ThemeProvider } from "@mui/material/styles";
import { CacheProvider, EmotionCache } from "@emotion/react";
import theme from "../material/theme";
import createEmotionCache from "../material/createEmotionCache";
import { Box, CssBaseline, Container, Typography, Link } from "@mui/material";

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
  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
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
            <Component {...pageProps} />
          </Container>
        </main>
        <Copyright sx={{ mt: 8, mb: 4 }} />
      </ThemeProvider>
    </CacheProvider>
  );
}