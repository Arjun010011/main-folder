import React from 'react';
import notFound from 'images/notFound.png';


const PageNotFound = () => {
    
    const handleNavigateToHomePage=()=>{
        window.location = '/dashboard';
    }

    return (
        <div id="wrapper" onClick={handleNavigateToHomePage}>
            <img src={notFound} style={{cursor:'pointer',height:'-webkit-fill-available',width:'-webkit-fill-available'}}/>
            <div id="info">
                <h3>This page could not be found</h3>
            </div>
        </div >
    )
}

export default PageNotFound