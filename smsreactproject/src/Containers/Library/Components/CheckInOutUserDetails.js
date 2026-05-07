import React, { forwardRef } from "react";
import {
  Paper,
  Table,
  TableContainer,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Grid,
} from "@material-ui/core";
import {
  numberWithCommas,
  dateFormat,
  getCommaSeperatedArrayOfObjects,
} from "Includes/functions";
import role from "images/role.png";
import book_logo from "images/book.png";

export const CheckInOutUserDetails = forwardRef((props, ref) => {
  const { book_details, user_details, book_status, bookList } = props;
  const getbookList = () => {
    return (
      <>
        {book_details ? (
          <>
            <h4 className="table-heading">Book Details</h4>
            <TableContainer component={Paper} className="header-align mt-20">
              <Table aria-label="simple table">
                <TableBody>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Book Number
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book_number}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Book Status
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book_status}
                    </TableCell>
                  </TableRow>
                  {book_status && book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Issued On
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {book_details.issued_on
                          ? dateFormat(
                            book_details.issued_on,
                            "DD-MM-YYYY hh:mm A"
                          )
                          : ""}
                      </TableCell>
                    </TableRow>
                  )}
                  {book_status && book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Issued To User
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {book_details.issued_to_user}
                      </TableCell>
                    </TableRow>
                  )}
                  {book_status && book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Due Date
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50">
                        {book_details.due_date
                          ? dateFormat(
                            book_details.due_date,
                            "DD-MM-YYYY hh:mm A"
                          )
                          : ""}
                      </TableCell>
                    </TableRow>
                  )}
                  {book_status && book_status.includes("RETURN") && (
                    <TableRow>
                      <TableCell className="padding-0 pl-5 width-50  table-header-color">
                        Fine Amount
                      </TableCell>
                      <TableCell className="padding-0 pl-5 width-50 ">
                        {numberWithCommas(
                          book_details.fine_details?.fine_amount ?? 0
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Title
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book__title}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Category (Sub Category)
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {!!book_details?.book__sub_category__name
                        ? `${book_details.book__category__name} (${book_details?.book__sub_category__name} )`
                        : book_details.book__category__name}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Author
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.author_datas
                        ? getCommaSeperatedArrayOfObjects(
                          book_details.author_datas,
                          "name"
                        )
                        : ""}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="padding-0 pl-5 width-50  table-header-color">
                      Publisher
                    </TableCell>
                    <TableCell className="padding-0 pl-5 width-50 ">
                      {book_details.book__publisher__name}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <div className="mt-30 mb-20 text-align-center">
            <img src={book_logo} className="width-height-150px" />
          </div>
        )}
      </>
    );
  };

  const getUserList = () => {
    const profile_url = user_details?.staff_details
      ? user_details?.staff_details?.profile_pic_details?.file
      : user_details?.student_details?.profile_pic_details?.file;
    return (
      <div style={{ display: "flex", gap: "40px" }}>
        {user_details && (
          <Avatar
            src={profile_url}
            alt="Preview"
            className="height-width-120px"
          />
        )}
        <div style={{ flex: 1 }}>
          {user_details ? (
            <>
              <h4 className="table-heading">
                {user_details.is_staff ? "Staff Details" : "Student Details"}
              </h4>
              {user_details.is_staff ? (
                <TableContainer component={Paper} className="header-align mt-20">
                  <Table aria-label="simple table">
                    <TableBody>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Staff Name
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.staff_details?.name}
                        </TableCell>
                      </TableRow>
                      {/* <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Mobile Number
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.staff_details?.mobile_num}
                        </TableCell>
                      </TableRow> */}
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Group Name
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.staff_details?.designation}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Number Of Books Hold
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details.assigned_books.length }
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Fine Amount
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {numberWithCommas(user_details.total_fine_amount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <TableContainer component={Paper} className="header-align mt-20">
                  <Table aria-label="simple table">
                    <TableBody>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Student Name
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.student_details?.name}
                        </TableCell>
                      </TableRow>
                      {/* <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Mobile Number
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.student_details?.mobile_num}
                        </TableCell>
                      </TableRow> */}
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Standard
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.student_details?.standard_name}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Section
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details?.student_details?.section_name}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Number Of Books Hold
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {user_details.assigned_books.length }
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="padding-0 pl-5 width-50 table-header-color">
                          Fine Amount
                        </TableCell>
                        <TableCell className="padding-0 pl-5 width-50">
                          {numberWithCommas(user_details.total_fine_amount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <div className="mt-30 mb-20 text-align-center">
              <img src={role} className="width-height-150px" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* <Grid container spacing={2}>
        <Grid item md={6} xs={12}>
          <Paper
            className="paper-plain-bacground m-t-20px padding-15"
            style={{ minHeight: "285px", height: "95%" }}
          >
            {getbookList()}
          </Paper>
        </Grid> */}
      <Paper
        className="paper-plain-bacground m-t-20px p-20px"
        style={{ width: "800px" }}
      >
        {getUserList()}
      </Paper>
      {bookList.length > 0 && (
        <div>
          <h2 className="table-heading">
            Current Issued Book Details for {user_details?.is_staff ? user_details?.staff_details?.name : user_details?.student_details?.name}
          </h2>

          <Paper className="m-5 width-100-perc">
            <table width="100%" className="selectable-row-table mt-20">
              <thead className="table-select-hostel-thead">
                <th className={`selectable-table-head`}> Book Number </th>
                <th className={`selectable-table-head`}>
                  Category (Sub Category)
                </th>
                <th className={`selectable-table-head`}> Book Title </th>
                <th className={`selectable-table-head`}> Issue Date </th>
                <th className={`selectable-table-head`}> Renew Date </th>
                <th className={`selectable-table-head`}> Due Date </th>
                <th className={`selectable-table-head`}> Fine Amount </th>
              </thead>
              <tbody className="selectable-row-table-body">
                {bookList.map((book, index) => {
                  return (
                    <tr
                      onClick={() => this.handleSelectBook(index)}
                      key={index}
                      className={
                        book.id === book_details?.id
                          ? "selectable-row-table-row text-blue"
                          : "selectable-row-table-row"
                      }
                    >
                      <td className={"textAlign pl-15"}>
                        <div display="flex">
                          <div>{book.book_number}</div>
                        </div>
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {!!book?.book__sub_category__name
                          ? `${book.book__category__name} (${book?.book__sub_category__name} )`
                          : book.book__category__name}
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {/* {book.author_details
                          ? getCommaSeperatedArrayOfObjects(
                              book.author_datas,
                              "name"
                            )
                          : ""} */}
                        {!!book?.book__title
                          ? `${book.book__title} (${book?.book__title})`
                          : book.book__title}
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {book.issued_on
                          ? dateFormat(book.issued_on, "DD-MM-YYYY hh:mm A")
                          : ""}
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {book.renew_date
                          ? dateFormat(
                            book.renew_date,
                            "DD-MM-YYYY hh:mm A"
                          )
                          : "-"}
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {book.due_date
                          ? dateFormat(book.due_date, "DD-MM-YYYY hh:mm A")
                          : ""}
                      </td>
                      <td className={"textAlign pl-15 "}>
                        {numberWithCommas(book?.fine_details?.fine_amount)}
                      </td>
                    </tr>
                  );
                })}
                {bookList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center font-weight-bold">
                      No Data Found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Paper>
        </div>
      )}
    </div>
  );
});
