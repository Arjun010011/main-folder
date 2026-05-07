import React, { Suspense } from 'react';
import { Route, Redirect } from 'react-router-dom'


const isAuthenticate = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return true;
  }
}

const handleRedirect = (props, url) => {
  props.history.push({
    pathname: '/login',
    state: { redirectUrl: decodeURI(url) },
  });
}

const PrivateRoute = ({ component: Component, ...rest }) => (
  <>
    <Route {...rest} render={(props) => (
      isAuthenticate()
        ?
        <Suspense fallback={<div>Loading...</div>}>
          <Component {...props} />
        </Suspense>
        :
        handleRedirect(props, `${rest['location']['pathname']}${rest['location']['search']}`)
    )} />
  </>
)


export default PrivateRoute