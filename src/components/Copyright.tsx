import React from "react";
import { Typography, Link } from "@mui/material";

export function Copyright(props: any) {
  return (
    <>
      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        {...props}
      >
        {"We're no "}
        <Link
          color="inherit"
          href="https://www.youtube.com/watch?v=doEqUhFiQS4"
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
    </>
  );
}
