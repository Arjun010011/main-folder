import React from "react";
import { CircularProgress, Tooltip } from "@material-ui/core/";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";

export default class BarCodeDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      imgsrc: "",
      loading : true
    };
  }

  componentDidMount() {
    const url = GET_URL.librarybookcopy.api + this.props.selectedId + "/";
    const params = { is_download: 1 };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          imgsrc: response.data.data?.url,
        });
      }
      else{
        this.handleCloseLargeImage();
      }
      this.setState({ loading: false });
    });
  }

  handleCloseLargeImage = () => {
    this.props.closeModal();
  };

  render() {
    const { imgsrc, loading } = this.state;
    return (
      <div>
        <Dialog
          open={true}
          // onClose={this.handleClose}
          aria-labelledby="form-dialog-title"
        >
          <DialogTitle id="form-dialog-title"></DialogTitle>
          <DialogContent>
            <DialogContentText> Download the barcode </DialogContentText>
            <div>
              {loading ? (
                <div>
                  <CircularProgress />
                </div>
              ) : (
                <div>
                  <img
                    src={imgsrc}
                    alt="Image Preview"
                    className="set-question-large-image-preview"
                  />
                </div>
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.update} color="primary">
              Download
            </Button>
            <Button onClick={this.handleClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}
