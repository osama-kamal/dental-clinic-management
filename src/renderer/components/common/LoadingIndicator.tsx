import React from 'react';
import { Box, CircularProgress, LinearProgress, Typography } from '@mui/material';

interface LoadingIndicatorProps {
  message?: string;
  variant?: 'circular' | 'linear';
  size?: number;
  fullScreen?: boolean;
}

/**
 * Loading Indicator Component
 * Displays progress for long-running operations
 * Requirements: 9.2
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message = 'Loading...',
  variant = 'circular',
  size = 40,
  fullScreen = false,
}) => {
  const content = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          minHeight: '100vh',
          width: '100%',
        }),
        ...(!fullScreen && {
          padding: 4,
        }),
      }}
    >
      {variant === 'circular' ? (
        <CircularProgress size={size} />
      ) : (
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <LinearProgress />
        </Box>
      )}
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  return content;
};

interface ProgressBarProps {
  value: number;
  message?: string;
  showPercentage?: boolean;
}

/**
 * Progress Bar Component
 * Shows determinate progress for operations with known duration
 * Requirements: 9.2
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  message,
  showPercentage = true,
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      {message && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          {showPercentage && (
            <Typography variant="body2" color="text.secondary">
              {Math.round(value)}%
            </Typography>
          )}
        </Box>
      )}
      <LinearProgress variant="determinate" value={value} />
    </Box>
  );
};

interface InlineLoadingProps {
  size?: number;
  message?: string;
}

/**
 * Inline Loading Component
 * Small loading indicator for inline use (e.g., in buttons)
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({ size = 20, message }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <CircularProgress size={size} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};
