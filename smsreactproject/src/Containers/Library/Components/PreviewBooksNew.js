import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { withStyles } from "@material-ui/core/styles";
import {
  Button,
  Divider,
  Dialog,
  TextField,
  CircularProgress,
} from "@material-ui/core";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert, getPaginationProps } from "Includes/functions";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import LoadingGif from "Components/LoadingGif";
import { AddCircleOutline, DeleteOutline } from "@material-ui/icons";
import { DEFAULT_PAGINATION_WITHOUT_SORT_PROPS } from "Constants";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { FormattedMessage } from "react-intl";
import messages from "./../messages";
import PreviewTextField from "./PreviewTextField";

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

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

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

export default function PreviewBooks(props) {
  const classes = useStyles();
  const [fieldError, setFieldError] = React.useState({});
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [is_loading, set_is_loading] = React.useState(false);
  const [tableUpdating, set_tableUpdating] = React.useState(false);
  const [book_list, set_book_list] = React.useState([]);
  const [new_book_list, set_new_book_list] = React.useState([]);
  const [deletable_ids, set_deletable_ids] = React.useState([]);
  const [book_columns, set_book_columns] = React.useState([]);
  const [pagination, set_pagination] = React.useState({
    ...DEFAULT_PAGINATION_WITHOUT_SORT_PROPS,
  });
  const [auto_generate, set_auto_generate] = React.useState({
    prefix: "",
    postfix: "",
    from_value: 1,
  });

  const currentPagination = React.useRef(null);

  const handleClose = () => {
    props.closeInParent();
  };

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const saveAdjustment = () => {
    if (validate()) {
      let old_book_list = [];
      book_list.map((data) => {
        if (data["is_modified"]) {
          old_book_list.push(data);
        }
      });
      let details = {
        new_book_list: new_book_list,
        old_book_list: old_book_list,
        deletable_ids: deletable_ids,
      };
      props.saveBookList(details);
    }
  };

  const validate = () => {
    let return_value = true;
    let fieldError = {};
    book_list.map((data, index) => {
      if (!data.book_number) {
        fieldError[`${index}_book_number`] = "Enter Book Number";
        return_value = false;
      }
    });
    setFieldError(fieldError);
    return return_value;
  };

  const handleSearchChange = (e, index) => {
    const { value, name } = e.target;
    let bookDataTemp = [...book_list];
    let fieldErrorTemp = { ...fieldError };
    bookDataTemp[index][name] = value;
    bookDataTemp[index]["is_modified"] = true;
    delete fieldErrorTemp[`${index}_book_number`];
    set_book_list(bookDataTemp);
    setFieldError(fieldErrorTemp);
  };

  const handleNewSearchChange = (e, index) => {
    const { value, name } = e.target;
    let bookDataTemp = [...new_book_list];
    let fieldErrorTemp = { ...fieldError };
    bookDataTemp[index][name] = value;
    delete fieldErrorTemp[`${index}_book_number`];
    set_new_book_list(bookDataTemp);
    setFieldError(fieldErrorTemp);
  };

  const handleAutoGenerate = () => {
    let fieldErrorTemp = { ...fieldError };
    if (!auto_generate.from_value) {
      fieldErrorTemp["from_value"] = "Enter From Value";
      setFieldError(fieldErrorTemp);
      return;
    }
    if (!auto_generate.num_of_copes) {
      fieldErrorTemp["num_of_copes"] = "Enter To Value";
      setFieldError(fieldErrorTemp);
      return;
    }
    let new_book_list_temp = [];
    let start_value = parseInt(auto_generate.from_value);
    let end_value = parseInt(auto_generate.num_of_copes) + start_value;
    for (let i = start_value; i < end_value; i++) {
      new_book_list_temp.push({
        book_number: `${auto_generate.prefix}${i}${auto_generate.postfix}`,
      });
    }
    set_new_book_list(new_book_list_temp);
  };

  const handleAutoGenerateChange = (e) => {
    const { name, value } = e.target;
    let fieldErrorTemp = { ...fieldError };
    let auto_generate_temp = { ...auto_generate };
    auto_generate_temp[name] = value;
    fieldErrorTemp["autogenerate"] = "";
    fieldErrorTemp[name] = "";
    setFieldError(fieldErrorTemp);
    set_auto_generate(auto_generate_temp);
  };

  const handleDelete = (i, isEdit) => {
    if (isEdit) {
      let book_list_temp = [...book_list];
      let deletable_ids_temp = [...deletable_ids];
      deletable_ids_temp.push(book_list_temp[i]["id"]);
      set_deletable_ids(deletable_ids_temp);
      book_list_temp.splice(i, 1);
      set_book_list(book_list_temp);
    } else {
      let new_book_list_temp = [...new_book_list];
      new_book_list_temp.splice(i, 1);
      set_book_list(new_book_list_temp);
    }
  };

  const options = {
    selectableRows: "none",
    filterType: "dropdown",
    responsive: "simple",
    filter: false,
    download: true,
    print: false,
    viewColumns: false,
    rowsPerPageOptions: [5, 10, 25, 50, 100],
  };

  const handleNumberOfCopies = () => {
    return (
      <div
        // className="d-flex"
        style={{ width: "900px", justifyContent: "space-between" }}
      >
        <div className="d-flex mt-20">
          <div>
            <TextField
              autoComplete="off"
              label={"Prefix"}
              name={"prefix"}
              className="width-200-px"
              value={auto_generate.prefix}
              variant="outlined"
              inputProps={{ maxLength: 8 }}
              error={fieldError[`prefix`] && fieldError[`prefix`]}
              helperText={fieldError[`prefix`] && fieldError[`prefix`]}
              onChange={handleAutoGenerateChange}
              size="small"
            />
          </div>
          <div className="ml-20">
            <TextField
              autoComplete="off"
              label={"Postfix"}
              name={"postfix"}
              className="width-200-px"
              value={auto_generate.postfix}
              variant="outlined"
              inputProps={{ maxLength: 8 }}
              error={fieldError[`postfix`] && fieldError[`postfix`]}
              helperText={fieldError[`postfix`] && fieldError[`postfix`]}
              onChange={handleAutoGenerateChange}
              size="small"
            />
          </div>
          <div className="ml-20">
            <TextField
              autoComplete="off"
              label={"From Starting Value"}
              name={"from_value"}
              className="width-200-px"
              value={auto_generate.from_value}
              variant="outlined"
              inputProps={{ maxLength: 8 }}
              error={fieldError[`from_value`] && fieldError[`from_value`]}
              helperText={fieldError[`from_value`] && fieldError[`from_value`]}
              onChange={handleAutoGenerateChange}
              size="small"
            />
          </div>
          <div className="ml-20">
            <TextField
              autoComplete="off"
              label={"Number Of Copies"}
              name={"num_of_copes"}
              className="width-200-px"
              value={auto_generate.num_of_copes}
              variant="outlined"
              inputProps={{ maxLength: 8 }}
              error={fieldError[`num_of_copes`] && fieldError[`num_of_copes`]}
              helperText={
                fieldError[`num_of_copes`] && fieldError[`num_of_copes`]
              }
              onChange={handleAutoGenerateChange}
              size="small"
            />
          </div>
          <div className="ml-20">
            <Button className="custom-button" onClick={handleAutoGenerate}>
              <AddCircleOutline /> Add New Books
            </Button>
            <div className="text-red">{fieldError["autogenerate"]}</div>
          </div>
          {/* <div className="sub-heading-books-copy mt-20 text-bold">{`New Books (${new_book_list.length})`}</div>
          {new_book_list.map((bookData, index) => {
            return (
              <div className="d-flex align-items-center mv-20">
                <div className="fs-18 text-bold">{index + 1}</div>
                <div className="ml-10">
                  <TextField
                    autoComplete="off"
                    label={"Book Number"}
                    name={"book_number"}
                    className="width-100-per"
                    value={bookData.book_number}
                    variant="outlined"
                    inputProps={{ maxLength: 15 }}
                    error={
                      fieldError[`${index}_book_number`] &&
                      fieldError[`${index}_book_number`]
                    }
                    helperText={
                      fieldError[`${index}_book_number`] &&
                      fieldError[`${index}_book_number`]
                    }
                    onChange={(e) => handleNewSearchChange(e, index)}
                    size="small"
                  />
                </div>
                <div className="fs-18 text-bold">
                  <DeleteOutline
                    onClick={() => handleDelete(index)}
                    className="text-red pointer"
                  />
                </div>
              </div>
            );
          })} */}
        </div>
        <div className="d-flex mt-20">
          <Divider orientation="vertical" />
          <div className="ml-20">
            <div className="sub-heading-books-copy text-bold">{`New Books (${book_list.count})`}</div>
            <AllMUIDataTable
              key={book_list.data_list}
              title={
                tableUpdating ? <CircularProgress className="white-text" /> : ""
              }
              data={book_list.data_list}
              columns={book_columns}
              options={options}
              onTableChange={getBookCopies}
              serverSide={true}
              pagination={pagination}
              count={book_list.count}
            />
          </div>
          <div className="ml-20">
            <div className="sub-heading-books-copy text-bold">{`Existing Books (${book_list.count})`}</div>
            <AllMUIDataTable
              key={book_list.data_list}
              title={
                tableUpdating ? <CircularProgress className="white-text" /> : ""
              }
              data={book_list.data_list}
              columns={book_columns}
              options={options}
              onTableChange={getBookCopies}
              serverSide={true}
              pagination={pagination}
              count={book_list.count}
            />
            {/* {book_list.map((bookData, index) => {
              return (
                <div className="d-flex align-items-center mv-20">
                  <div className="fs-18 text-bold">{index + 1}</div>
                  <div className="ml-10">
                    <TextField
                      autoComplete="off"
                      label={"Book Number"}
                      name={"book_number"}
                      className="width-100-per"
                      value={bookData.book_number}
                      variant="outlined"
                      inputProps={{ maxLength: 15 }}
                      error={
                        fieldError[`${index}_book_number`] &&
                        fieldError[`${index}_book_number`]
                      }
                      helperText={
                        fieldError[`${index}_book_number`] &&
                        fieldError[`${index}_book_number`]
                      }
                      onChange={(e) => handleSearchChange(e, index)}
                      size="small"
                    />
                  </div>
                  <div className="fs-18 text-bold">
                    <DeleteOutline
                      onClick={() => handleDelete(index, true)}
                      className="text-red pointer"
                    />
                  </div>
                </div>
              );
            })} */}
          </div>
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    set_new_book_list(props?.stockItemDetails?.new_book_number ?? []);
    if (props.isEditForm) {
      set_is_loading(true);
      getBookCopies();
      const book_columns_temp = [
        {
          name: "book_number",
          label: "Book Number",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <>
                  <PreviewTextField
                    fieldValue={value}
                    // disabled={this.state.tableUpdating}
                    // onBlurFieldValue={(e) =>
                    //   this.handleChange(
                    //     e,
                    //   )
                    // }
                    max={1000000}
                  />
                </>
              );
            },
          },
        },
        {
          name: "book__title",
          label: "Book Title",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "book__category__name",
          label: <FormattedMessage {...messages.libCategorySelectCategory} />,
          options: {
            filter: true,
            sort: true,
          },
        },
      ];
      set_book_columns([...book_columns_temp]);
    }
  }, []);

  const getBookCopies = (paginationProps) => {
    let currentPaginationTemp = currentPagination;
    currentPaginationTemp = pagination;
    if (paginationProps) {
      currentPaginationTemp = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(currentPaginationTemp);
    const url = GET_URL.librarybookcopy.api;
    let param = { ...pagination_params, is_active: true, book: props.bookId };
    getRequest(url, param, props).then((response) => {
      if (response && response.status === 200) {
        props.stockItemDetails["book_number"].map((bookData) => {
          response.data.data.map((data) => {
            if (data["id"] === bookData["id"]) {
              data["book_number"] = bookData["book_number"];
              data["is_modified"] = true;
            }
          });
        });
        set_pagination(currentPaginationTemp);
        set_book_list(response.data.data);
        set_is_loading(false);
      }
    });
  };

  return (
    <div>
      <Dialog aria-labelledby="customized-dialog-title" open={true} fullScreen>
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("close")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Enter Book Numbers
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent>
          {is_loading ? <LoadingGif /> : handleNumberOfCopies()}
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            onClick={saveAdjustment}
            color="primary"
            className="submit"
            disabled={props.saveButtonBlocked}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={snackbar}
        autoHideDuration={10000}
        onClose={handleCloseSnackBar}
      >
        <Alert onClose={handleCloseSnackBar} severity="error">
          {alertData}
        </Alert>
      </Snackbar>
    </div>
  );
}
