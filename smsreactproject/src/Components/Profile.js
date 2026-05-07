import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import ListItemText from '@material-ui/core/ListItemText';
import Box from '@material-ui/core/Box';
import Logo from './st.jpg';
import Grid from '@material-ui/core/Grid';
import { makeStyles } from '@material-ui/core/styles';
import AccountCircleRoundedIcon from '@material-ui/icons/AccountCircleRounded';
import LockOpenRoundedIcon from '@material-ui/icons/LockOpenRounded';
import ExitToAppRoundedIcon from '@material-ui/icons/ExitToAppRounded';

const useStyles = makeStyles(theme => ({
    logoImage: {
        width:"40px",
         height:"40px",
         borderRadius:"50px",
         position: "relative"
      },
      textColor:{
          color:"#5e656b",
         
      },
      dropdownCaret:{
            display: "flex",
            position:"absolute",
            top: "21px",
            right: "0px",
            justifyContent:"center",
            borderWidth: "8px",
            borderStyle: "solid",
            borderRight: "10px solid transparent",
            borderColor: "white transparent transparent",
            width: "0",
            height: "0"
          }
    }));
const StyledMenu = withStyles({
  paper: {
    border: '1px solid #d3d4d5',
  },
})(props => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
));
const StyledMenuItem = withStyles(theme => ({
  root: {
    '&:focus': {
      backgroundColor: theme.palette.primary.main,
      '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
        color: theme.palette.common.white,
      },
    },
  },
}))(MenuItem);
export default function Profile() {
    const classes= useStyles()
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };
  return (
    <div className={classes.profileImg}>
        <Box onClick={handleClick}>
          <Grid container>
          <Grid item xs={6}>
            <img src={Logo} className={classes.logoImage}/>
          </Grid>
            <Grid item xs={6}>
              Bhagya
              <div className={classes.dropdownCaret}></div>
            </Grid>
            </Grid>
        </Box>
      <StyledMenu
        id="customized-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <StyledMenuItem className={classes.textColor}>
            <AccountCircleRoundedIcon></AccountCircleRoundedIcon>
          <Box ml={2}>
          <ListItemText primary="Profile" />
          </Box>
        </StyledMenuItem>

        <StyledMenuItem className={classes.textColor}>
          <LockOpenRoundedIcon></LockOpenRoundedIcon>
            <Box ml={2}>
              <ListItemText primary="Change password" />
            </Box>
        </StyledMenuItem>

        <StyledMenuItem className={classes.textColor}>
          <ExitToAppRoundedIcon></ExitToAppRoundedIcon>
          <Box ml={2}>
            <ListItemText primary="LogOut" />
            </Box>
        </StyledMenuItem>
      </StyledMenu>
    </div>
  );
}
