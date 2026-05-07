import React from 'react';
import { Box } from '@material-ui/core';

import loadingBar from './../../images/loading.gif';

function LoadingGif() {
    return (
            <Box display='flex'>
                <img src={loadingBar} className='loading'  alt='loading' />
            </Box>
    )
}

export default LoadingGif
