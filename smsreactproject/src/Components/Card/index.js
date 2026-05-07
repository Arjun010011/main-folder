import React, { useState, useEffect } from 'react'
import { Box, Paper, Icon, Button, Tooltip } from '@material-ui/core';
import {
    numberWithCommas
} from "Includes/functions";
import './styles.scss'

import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'

function Card(props) {
    const { header, subHeader, columnsHeader, columnsData, action, addAction, columnError } = props;

    const withActionCount = 3;
    const withoutActionCount = 4;
    const [columnData, setColumnData] = useState([]);
    const [columnHeader, setColumnHeader] = useState([]);
    const [columnsError, setColmnError] = useState('');

    useEffect(() => {
        setColumnData(columnsData)
    }, [columnsData]);

    useEffect(() => {
        setColumnHeader(columnsHeader)
    }, [columnsHeader]);

    useEffect(() => {
        setColmnError(columnError)
    }, [columnError]);

    return (
        <Paper className='custom-card-body'>
            <Box className='custom-card-header'>
                <Box className='header'>{header}</Box>
                <Box className='sub-header'>{subHeader}</Box>
            </Box>
            <Box className='row-header'>
                {columnHeader && columnHeader.map((rowHeader) => {
                    return (
                        <Box className={`${rowHeader.className} ${rowHeader.is_amount_field ? 'text-align-right pr-20-px' : ''}`}>
                            {rowHeader.label}
                        </Box>
                    )
                })}
            </Box>
            <Box className={action ? 'fix-card-height-with-action' : addAction ? '' : 'fix-card-height-without-action'}>
                {columnData && columnData.map((rowData, index) => {
                    return (
                        <Box key={index}>
                            <Box className='row-data'>
                                {columnHeader && columnHeader.map((rowColumn) => {
                                    let dataValue = (rowData.is_amount_field && rowColumn.is_amount_field) ? numberWithCommas(rowData[rowColumn.name])
                                        : rowData[rowColumn.name];
                                    return (
                                        <Box className={`${rowColumn.className} ${rowColumn.is_amount_field ? 'text-align-right pr-20-px' : ''}`}>
                                            {rowData.tooltipData &&
                                                <Tooltip
                                                    enterDelay={100}
                                                    enterNextDelay={200}
                                                    disableHoverListener={!rowData.tooltipData[rowColumn.name]}
                                                    title={rowData.tooltipData[rowColumn.name]}
                                                    placement='bottom-start'
                                                    arrow={true}
                                                    classes={{
                                                        tooltip: 'tooltip-show-data'
                                                    }}
                                                >
                                                    <span>  {
                                                        dataValue
                                                    }
                                                    </span>
                                                </Tooltip>
                                            }
                                            {!rowData.tooltipData &&
                                                <span>  {
                                                    dataValue
                                                }
                                                </span>
                                            }
                                        </Box>
                                    )
                                })
                                }
                            </Box>
                        </Box>
                    )
                })
                }
                {
                    columnsError && <Box className='red-text card-col-error'>{columnsError}</Box>
                }
            </Box>

            {
                action &&
                <Box className='action-outer-section'>  <Box className='action-section'>{action}</Box></Box>
            }
            {
                addAction &&
                addAction
            }
        </Paper>
    )
}

export default Card