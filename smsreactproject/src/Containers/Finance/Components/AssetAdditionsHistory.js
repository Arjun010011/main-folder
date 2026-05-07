import React, { Component } from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography, CircularProgress, Button } from '@material-ui/core';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { numberWithCommas, dateFormat } from 'Includes/functions';

class AssetAdditionsHistory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            additions: [],
            loading: true,
            loadingMore: false,
            error: null,
            pageno: 1,
            limit: 5,
            hasMore: false,
        };
    }

    componentDidMount() {
        this.fetchAdditions();
    }

    fetchAdditions = async (loadMore = false) => {
        const { assetId } = this.props;
        if (!assetId) {
            this.setState({ loading: false, error: 'No asset ID provided' });
            return;
        }

        const { limit, pageno, additions } = this.state;
        const currentPage = loadMore ? pageno + 1 : 1;

        const url = GET_URL.assetCostMovements.api;
        const params = {
            asset: assetId,
            movement_type: 'ADDITION',
            is_active: true,
            limit: limit,
            pageno: currentPage,
            ordering: '-created'
        };

        try {
            if (loadMore) {
                this.setState({ loadingMore: true });
            } else {
                this.setState({ loading: true });
            }

            const response = await getRequest(url, params, this.props);
            if (response && response.status === 200) {
                const responseData = response.data.data;
                const newAdditions = responseData.data_list || [];
                
                this.setState({ 
                    additions: loadMore ? [...additions, ...newAdditions] : newAdditions,
                    loading: false,
                    loadingMore: false,
                    pageno: currentPage,
                    hasMore: responseData.next !== null
                });
            } else {
                this.setState({ loading: false, loadingMore: false, error: 'Failed to fetch additions history' });
            }
        } catch (error) {
            console.error("Error fetching asset additions:", error);
            this.setState({ loading: false, loadingMore: false, error: 'Error fetching additions history' });
        }
    }

    handleLoadMore = () => {
        this.fetchAdditions(true);
    }

    render() {
        const { additions, loading, loadingMore, error, hasMore } = this.state;

        if (loading) {
            return (
                <TableRow>
                    <TableCell colSpan={9} align="center">
                        <Box p={3} display="flex" justifyContent="center" alignItems="center">
                            <CircularProgress size={24} style={{ marginRight: 16 }} />
                            <Typography variant="body2" color="textSecondary">Loading additions history...</Typography>
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }

        if (error) {
            return (
                <TableRow>
                    <TableCell colSpan={9} align="center">
                        <Box p={3}>
                            <Typography variant="body2" color="error">{error}</Typography>
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }

        if (additions.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={9} align="center">
                        <Box p={3} bgcolor="#f9f9f9" borderRadius={4} margin={1}>
                            <Typography variant="body2" color="textSecondary">No additions history found for this asset.</Typography>
                        </Box>
                    </TableCell>
                </TableRow>
            );
        }

        return (
            <TableRow>
                <TableCell colSpan={9} style={{ paddingBottom: 0, paddingTop: 0 }}>
                    <Box margin={2} bgcolor="#f5f7fa" padding={2} borderRadius={4} border="1px solid #e0e0e0">
                        <Typography variant="subtitle2" gutterBottom component="div" color="primary">
                            Additions History
                        </Typography>
                        <Table size="small" aria-label="additions">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Transaction Date</strong></TableCell>
                                    <TableCell><strong>Financial Year</strong></TableCell>
                                    <TableCell align="right"><strong>Amount Added</strong></TableCell>
                                    <TableCell><strong>Remarks</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {additions.map((historyRow) => (
                                    <TableRow key={historyRow.id}>
                                        <TableCell component="th" scope="row">
                                            {historyRow.created ? dateFormat(historyRow.created, "DD-MM-YYYY hh:mm A") : '-'}
                                        </TableCell>
                                        <TableCell>{historyRow.financial_year_name || '-'}</TableCell>
                                        <TableCell align="right">{numberWithCommas(historyRow.amount)}</TableCell>
                                        <TableCell>{historyRow.remarks || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {hasMore && (
                            <Box mt={2} display="flex" justifyContent="center">
                                <Button 
                                    size="small" 
                                    color="primary" 
                                    onClick={this.handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? 'Loading...' : 'Show More'}
                                </Button>
                            </Box>
                        )}
                    </Box>
                </TableCell>
            </TableRow>
        );
    }
}

export default AssetAdditionsHistory;
