import React from 'react';

import {Link} from 'react-router-dom';

export default class extends React.Component {

  render() {
    return (
      <div>
        <p>
        Creating a new account for MagIC currently uses the old earthref software system, which we will rewrite for our new software stack in the future. Please excuse the different visual theme.
        </p>
        <p>
         To create a new account for MagIC, start <a href='https://earthref.org/register/'><font color='purple'>here</font></a> and fill out the User Information, your user name and password, and if you want to get MagIC or other EarthRef newsletters. Then you will be logged in and have an account to use in the future. Please feel free to email Nick Jarboe (<a href='mailto:njarboe@ucsd.edu'><font color='purple'>njarboe@ucsd.edu</font></a>) with questions or comments.
        </p>
      </div>
    );
  }

}

