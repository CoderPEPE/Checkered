"use client";

import type { OracleData } from "../types";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

interface Props {
  oracle: OracleData | null;
  loading: boolean;
}

export default function OracleStatus({ oracle, loading }: Props) {
  return (
    <Box component="section">
      <Typography variant="subtitle2" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5 }}>
        Oracle Status
      </Typography>
      {oracle ? (
        <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis" }} title={oracle.address}>
                {oracle.address}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Contract</Typography>
              <Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis" }} title={oracle.contract}>
                {oracle.contract}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Mock Mode</Typography>
              <Typography variant="body2">{oracle.mockMode ? "Enabled" : "Disabled"}</Typography>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Poll Interval</Typography>
              <Typography variant="body2">{Number(oracle.pollInterval) / 1000}s</Typography>
            </Grid>
          </Grid>
        </Paper>
      ) : (
        !loading && (
          <Typography variant="body2" color="text.secondary">Could not load oracle status</Typography>
        )
      )}
    </Box>
  );
}
