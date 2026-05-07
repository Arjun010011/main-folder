import React from "react";
import { withStyles } from "@material-ui/core/styles";
import { Button, Dialog } from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(1),
  },
}))(MuiDialogActions);

const header = "Status Infromations";

export default function AdjustmentModal(props) {
  const [open] = React.useState(true);
  const [body, setBody] = React.useState([]);

  const handleClose = () => {
    props.closeInParent();
  };

  React.useEffect(() => {
    let temp_list = [];
    if (props.status_list) {
      Object.keys(props.status_list).map((data) => {
        temp_list.push(props.status_list[data]);
      });
    }
    setBody(temp_list);
  }, []);

  return (
    <div>
      <Dialog aria-labelledby="customized-dialog-title" open={open}>
        <DialogTitle id="customized-dialog-title" onClose={handleClose}>
          {header}
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            <table className="w-100">
              <thead>
                <tr className="thead-adjustment">
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {!!body &&
                  body.map((data, index) => {
                    return (
                      <tr className="tbody-adjustment">
                        <td className="padding-0">{data["alias_name"]}</td>
                        <td className="padding-0">{data["description"]}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={props.saveButtonBlocked ? "" : () => handleClose()}
            color="primary"
            disabled={props.saveButtonBlocked}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
