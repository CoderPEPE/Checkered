"use client";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Overlay({ open, onClose, title, children }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: { bgcolor: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          px: 3.5,
          py: 2.5,
        }}
      >
        <Box component="span" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {title}
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": { color: "text.primary", bgcolor: "rgba(255,255,255,0.04)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3.5, py: 3, maxHeight: "70vh" }}>
        <Box>{children}</Box>
      </DialogContent>
    </Dialog>
  );
}
