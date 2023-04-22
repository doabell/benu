import React from "react";
import { Typography, Link, IconButton, Stack } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";

export function Copyright(props: any) {
  return (
    <>
      <Stack
        direction="row"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        sx={{ my: 2 }}
      >
        <IconButton
          aria-label="view on GitHub"
          href="https://github.com/doabell/benu"
        >
          <GitHubIcon />
        </IconButton>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          align="center"
          {...props}
        >
          {"We're no "}
          <Link
            color="inherit"
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          >
            strangers to love
          </Link>
          {"."}
          <br />
          <Link
            color="inherit"
            href="https://middlebury.api.nutrislice.com/terms-of-use"
          >
            Nutrislice Terms of Use
          </Link>
        </Typography>
      </Stack>
    </>
  );
}
