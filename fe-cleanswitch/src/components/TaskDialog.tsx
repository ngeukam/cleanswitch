import {
  Dialog,
  DialogContent,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  Avatar,
  IconButton,
  Box,
  useTheme,
  Chip,
} from "@mui/material";
import { Close, Circle, Apartment, Person, CleaningServices, Euro } from "@mui/icons-material";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface TaskItem {
  [key: string]: any;
}

interface TaskDialogProps {
  open: boolean;
  handleClose: () => void;
  modalTitle: string | ReactNode;
  jsonData: TaskItem[] | any[];
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  enableAnimations?: boolean;
}

export const TaskDialog = ({
  open,
  handleClose,
  modalTitle,
  jsonData,
  maxWidth = "sm",
  enableAnimations = true,
}: TaskDialogProps) => {
  const theme = useTheme();

  const dialogVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const itemVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  // Normaliser les données pour s'assurer qu'elles sont toujours un tableau
  const normalizedData = Array.isArray(jsonData) ? jsonData : [jsonData];

  // Check if data is array of strings (like assigned_to_names)
  const isStringArray = 
    normalizedData.length > 0 && 
    normalizedData.every((item) => typeof item === "string");

  // Check if data is array of user objects
  const isUserArray =
    normalizedData.length > 0 &&
    normalizedData.every((item) => 
      item && 
      typeof item === 'object' && 
      (item.first_name || item.last_name || item.username)
    );

  // Check if data is array of apartment objects
  const isApartmentArray =
    normalizedData.length > 0 &&
    normalizedData.every((item) => 
      item && 
      typeof item === 'object' && 
      (item.name || item.number || item.apartmentType !== undefined)
    );

  // Check if data is array of simple objects with id and name
  const isSimpleObjectArray =
    normalizedData.length > 0 &&
    normalizedData.every((item) => 
      item && 
      typeof item === 'object' && 
      (item.id !== undefined && item.name !== undefined)
    );

  // Render user item
  const renderUserItem = (user: any, index: number) => (
    <Box
      key={user.id || index}
      component={enableAnimations ? motion.div : "div"}
      {...(enableAnimations && {
        initial: "hidden",
        animate: "visible",
        variants: itemVariants,
        transition: { delay: index * 0.05 },
      })}
    >
      <ListItem sx={{ px: 3, py: 2 }}>
        <ListItemIcon sx={{ minWidth: 32, mr: 2 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: theme.palette.primary.main,
            }}
          >
            <Person sx={{ fontSize: "14px", color: "white" }} />
          </Avatar>
        </ListItemIcon>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight="500">
            {user.first_name} {user.last_name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            {user.username && (
              <Chip
                label={`@${user.username}`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
            {user.department && (
              <Chip
                label={user.department}
                size="small"
                variant="filled"
                color="secondary"
              />
            )}
            {user.email && (
              <Chip
                label={user.email}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </ListItem>
      {index < normalizedData.length - 1 && <Divider sx={{ mx: 3 }} />}
    </Box>
  );

  // Render apartment item
  const renderApartmentItem = (apartment: any, index: number) => (
    <Box
      key={apartment.id || index}
      component={enableAnimations ? motion.div : "div"}
      {...(enableAnimations && {
        initial: "hidden",
        animate: "visible",
        variants: itemVariants,
        transition: { delay: index * 0.05 },
      })}
    >
      <ListItem sx={{ px: 3, py: 2 }}>
        <ListItemIcon sx={{ minWidth: 32, mr: 2 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: theme.palette.success.main,
            }}
          >
            <Apartment sx={{ fontSize: "14px", color: "white" }} />
          </Avatar>
        </ListItemIcon>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight="500">
            {apartment.number ? `${apartment.number} - ${apartment.name}` : apartment.name}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            {apartment.apartmentType && (
              <Chip
                label={apartment.apartmentType}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}
            {apartment.price !== undefined && apartment.currency && (
              <Chip
                label={`${apartment.price} ${apartment.currency}`}
                size="small"
                variant="outlined"
                color="success"
              />
            )}
            {apartment.cleaned !== undefined && (
              <Chip
                icon={<CleaningServices sx={{ fontSize: '14px' }} />}
                label={apartment.cleaned ? "Cleaned" : "Not Cleaned"}
                size="small"
                variant="filled"
                color={apartment.cleaned ? "success" : "error"}
              />
            )}
            {apartment.inService !== undefined && (
              <Chip
                label={apartment.inService ? "In Service" : "Out of Service"}
                size="small"
                variant="filled"
                color={apartment.inService ? "info" : "warning"}
              />
            )}
          </Box>
        </Box>
      </ListItem>
      {index < normalizedData.length - 1 && <Divider sx={{ mx: 3 }} />}
    </Box>
  );

  // Render simple object item (with id and name)
  const renderSimpleObjectItem = (item: any, index: number) => (
    <Box
      key={item.id || index}
      component={enableAnimations ? motion.div : "div"}
      {...(enableAnimations && {
        initial: "hidden",
        animate: "visible",
        variants: itemVariants,
        transition: { delay: index * 0.05 },
      })}
    >
      <ListItem sx={{ px: 3, py: 2 }}>
        <ListItemIcon sx={{ minWidth: 32, mr: 2 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: theme.palette.info.main,
            }}
          >
            <Circle sx={{ fontSize: "14px", color: "white" }} />
          </Avatar>
        </ListItemIcon>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight="500">
            {item.name}
          </Typography>
          {item.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {item.description}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            {item.id && (
              <Chip
                label={`ID: ${item.id}`}
                size="small"
                variant="outlined"
              />
            )}
            {item.status && (
              <Chip
                label={item.status}
                size="small"
                variant="filled"
                color={
                  item.status === 'active' ? 'success' :
                  item.status === 'inactive' ? 'error' :
                  item.status === 'pending' ? 'warning' : 'default'
                }
              />
            )}
          </Box>
        </Box>
      </ListItem>
      {index < normalizedData.length - 1 && <Divider sx={{ mx: 3 }} />}
    </Box>
  );

  // Render simple string item
  const renderStringItem = (item: any, index: number) => (
    <Box
      key={index}
      component={enableAnimations ? motion.div : "div"}
      {...(enableAnimations && {
        initial: "hidden",
        animate: "visible",
        variants: itemVariants,
        transition: { delay: index * 0.05 },
      })}
    >
      <ListItem sx={{ px: 3, py: 2 }}>
        <ListItemIcon sx={{ minWidth: 32, mr: 2 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: theme.palette.primary.main,
            }}
          >
            <Circle sx={{ fontSize: "14px", color: "white" }} />
          </Avatar>
        </ListItemIcon>
        <Typography variant="body1">{String(item)}</Typography>
      </ListItem>
      {index < normalizedData.length - 1 && <Divider sx={{ mx: 3 }} />}
    </Box>
  );

  // Render generic object item
  const renderGenericItem = (item: any, index: number) => (
    <Box
      key={item.id || index}
      component={enableAnimations ? motion.div : "div"}
      {...(enableAnimations && {
        initial: "hidden",
        animate: "visible",
        variants: itemVariants,
        transition: { delay: index * 0.05 },
      })}
    >
      <ListItem sx={{ px: 3, py: 2 }}>
        <ListItemIcon sx={{ minWidth: 32, mr: 2 }}>
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: theme.palette.grey[500],
            }}
          >
            <Circle sx={{ fontSize: "14px", color: "white" }} />
          </Avatar>
        </ListItemIcon>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(item, null, 2)}
          </Typography>
        </Box>
      </ListItem>
      {index < normalizedData.length - 1 && <Divider sx={{ mx: 3 }} />}
    </Box>
  );

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth={maxWidth}
      onClose={handleClose}
      PaperProps={{
        component: enableAnimations ? motion.div : "div",
        ...(enableAnimations && {
          initial: "hidden",
          animate: "visible",
          variants: dialogVariants,
          transition: { duration: 0.3 },
        }),
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[10],
          background: theme.palette.background.paper,
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 3,
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="600" component="div">
          {modalTitle}
        </Typography>
        <IconButton onClick={handleClose} aria-label="close">
          <Close />
        </IconButton>
      </Box>
      <Divider sx={{ mx: 3 }} />
      <DialogContent sx={{ p: 0 }}>
        <List sx={{ py: 0 }}>
          {normalizedData.length === 0 ? (
            <ListItem sx={{ px: 3, py: 4 }}>
              <Typography variant="body2" color="text.secondary" textAlign="center" width="100%">
                No data available
              </Typography>
            </ListItem>
          ) : isStringArray ? (
            // Render simple string array
            normalizedData.map((item, index) => renderStringItem(item, index))
          ) : isUserArray ? (
            // Render user array
            normalizedData.map((item, index) => renderUserItem(item, index))
          ) : isApartmentArray ? (
            // Render apartment array
            normalizedData.map((item, index) => renderApartmentItem(item, index))
          ) : isSimpleObjectArray ? (
            // Render simple object array (id + name)
            normalizedData.map((item, index) => renderSimpleObjectItem(item, index))
          ) : (
            // Render generic object array
            normalizedData.map((item, index) => renderGenericItem(item, index))
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};