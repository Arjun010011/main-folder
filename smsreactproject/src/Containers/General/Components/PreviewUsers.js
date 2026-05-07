import React, { useRef } from "react";
import { withStyles } from "@material-ui/core/styles";
import { Box, Dialog, DialogActions, Button, CircularProgress } from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import AllMUIDataTable from "Components/AllMUIDataTable";
import LoadingGif from "Components/LoadingGif";

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

export default function StudentFeePaidHistoryModal(props) {
  const {
    user_list,
    columns_list,
    options,
    onTableChange,
    pagination,
    handleSubmit,
    handleCloseChange,
    loading
  } = props;

  return (
    <div>
      <Dialog
        open={true}
        className="dialog-custom-video-setquestion-form"
        aria-labelledby="form-dialog-title"
      >
        <DialogContent>
            <AllMUIDataTable
              key={user_list.data_list}
              data={user_list.data_list}
              columns={columns_list}
              options={options}
              onTableChange={onTableChange}
              serverSide={true}
              pagination={pagination}
              count={user_list.count}
              title={loading?<CircularProgress className="white-text"/>:`Total recievers ${user_list.count}`}
            />
        </DialogContent>
        <DialogActions>
          <Box mt={3}>
            <Button
              variant="contained"
              color="primary"
              className="apply-leave-reset-button"
              onClick={handleCloseChange}
            >
              Close
            </Button>
            {handleSubmit && (
              <Button
                variant="contained"
                color="primary"
                className="submit ml-20"
                onClick={() => handleSubmit("isApproved")}
              >
                Submit
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
    </div>
  );
}
