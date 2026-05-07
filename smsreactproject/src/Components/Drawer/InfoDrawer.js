import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  useTheme,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";

const InfoDrawer = ({ open, onClose, title, description, examples = [] }) => {
  const theme = useTheme();

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box width={380} p={3} role="presentation">
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider style={{ margin: "16px 0" }} />

        {/* Description */}
        <Typography variant="body1" gutterBottom>
          {description}
        </Typography>

        {/* Examples */}
        {examples.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Examples:
            </Typography>
            {examples.map((ex, idx) => {
              const colors = {
                bg: ex.bgColor || theme.palette.grey[100],
                text: ex.textColor || theme.palette.text.primary,
              };

              return (
                <Box
                  key={idx}
                  mt={1.5}
                  p={2}
                  borderRadius={8}
                  style={{ backgroundColor: colors.bg }}
                >
                  <Typography
                    variant="body2"
                    gutterBottom
                    style={{ color: colors.text, fontWeight: 600 }}
                  >
                    {ex.icon} {ex.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {ex.text}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default InfoDrawer;
