import React, { useState } from "react";

import {
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@material-ui/core";

import { DIVIDE_TERMS_LIST } from "Constants";
import { Dropdown } from "Components/DropDown";

export default function DivideTermsDialog(props) {
  const [numberOfTerms, setNumberOfTerms] = useState(1);

  const handleClose = () => {
    props.handleCloseDivideTerms();
  };

  const handleChange = (e) => {
    const { value } = e.target;
    setNumberOfTerms(() => value);
  };

  const update = () => {
    props.handleSubmitNumOfTerms(numberOfTerms)
  };

  return (
    <Dialog
      open={true}
      className={"action-basic-detail-width"}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title"></DialogTitle>
      <DialogContent>
        <DialogContentText>
          {`Enter the Number Of Terms To Divide`}
        </DialogContentText>
        <Grid container className="flex-justify-center">
          <Dropdown
            value={numberOfTerms}
            data={DIVIDE_TERMS_LIST}
            onChange={handleChange}
          />
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
        <Button onClick={update} color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
