import React, { useState, useEffect, useImperativeHandle } from "react";
import { CircularProgress } from "@material-ui/core";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { options, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';

const LibraryReport = React.forwardRef((props, ref) => {
  const { isOpen, videoUrl } = props;

  const [tableUpdating, setTableUpdating] = useState(false);
  const [issueBookList, setIssueBookList] = useState([]);
  const [columns, setColumns] = useState([]);
  const [pagination, setPagination] = useState({ ...DEFAULT_PAGINATION_PROPS_ID_LIST });

  const getIssueList=()=>{
    
  }

  return (
    <div>
      <AllMUIDataTable
        title={tableUpdating ? <CircularProgress className="white-text" /> : ""}
        key={issueBookList.data_list}
        data={issueBookList.data_list}
        columns={columns}
        options={options}
        onTableChange={getIssueList}
        serverSide={true}
        pagination={pagination}
        count={issueBookList.count}
      />
    </div>
  );
});
export default withRouter(LibraryReport);
