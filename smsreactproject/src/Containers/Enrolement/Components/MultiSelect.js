import React from "react";
import MUIDataTable from "mui-datatables";
const columns = [
  {
    name: "name",
    label: "Name",
    options: {
      filter: true,
      sort: true,
    },
  },
  {
    name: "standard",
    label: "standard",
    options: {
      filter: true,
      sort: false,
    },
  },
  {
    name: "dob",
    label: "dob",
    options: {
      filter: true,
      sort: false,
    },
  },
  {
    name: "email",
    label: "email",
    options: {
      filter: true,
      sort: false,
    },
  },
  {
    name: "mobile_num",
    label: "mobile_num",
    options: {
      filter: true,
      sort: false,
    },
  },
  {
    name: "current_reg_num",
    label: "current_reg_num",
    options: {
      filter: true,
      sort: false,
    },
  },
];

// const data = [
//     {
//         "id": 1,
//         "name": "Nagendra  ",
//         "standard": "standard 1",
//         "dob": "2019-11-01",
//         "email": "",
//         "gender": "",
//         "current_reg_num": "",
//         "mobile_num": ""
//     },
//     {
//         "id": 2,
//         "name": "nikhil  ",
//         "standard": "standard 1",
//         "dob": "2019-11-02",
//         "email": "",
//         "gender": "",
//         "current_reg_num": "",
//         "mobile_num": ""
//     }
// ]

const MultiSelect = ({ data, onChange }) => {
  const onRowsSelect = (value) => {
    onChange(value);
  };
  const options = {
    filterType: "checkbox",
    download: false,
    print: false,
    delete: false,
    onRowsSelect: onRowsSelect,
  };
  return (
    <MUIDataTable
      title={"Student List"}
      data={data}
      columns={columns}
      options={options}
    />
  );
};

export default MultiSelect;
