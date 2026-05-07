import React from 'react'
import {
    createTheme,
    MuiThemeProvider,
} from "@material-ui/core/styles";
import MUIDataTable from "mui-datatables";
import variables from 'styles/variables.scss';

const getMuiTheme = () => createTheme({
    overrides: {
        MUIDataTable: {
            responsiveScroll: {
                maxHeight: '587px!important',
                minHeight: '587px!important',
                overflow: 'auto'
            },
        },
        MUIDataTableBodyCell: {
            root: {
                backgroundColor: "white",
                textAlign: 'left',
            }
        },
        MUIDataTableHeadCell: {
            root: {
                textAlign: 'left',
                justifyContent: 'left',
            },
            fixedHeader: {
                textAlign: 'left',
                justifyContent: 'left',
            },
            toolButton: {
                justifyContent: "left",
            },
        },
    },
})

function SortableTable(props) {
    const { title, data, columns, options } = props
    return (
        <div>
            <MuiThemeProvider theme={getMuiTheme()}>
                <MUIDataTable
                    title={title}
                    data={data || []}
                    columns={columns}
                    options={options}
                />
            </MuiThemeProvider>
        </div>
    )
}


export default SortableTable;