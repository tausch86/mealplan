/** @jsx React.DOM */

var CallToAction = React.createClass({

  render : function() {
    return (
      <div className="jumbotron">
        <h1 className="slogan">Cook Better Food</h1>
        <h3 className="subSlogan">Create personalized meal plans with recipes you&#39;ll love</h3>
        <div className="logInOrSignUp">
          <button type='button' className="btn btn-primary" data-route='/login' onClick={this.props.linkHandler}>Log In</button>
          <button type='button' className="btn btn-default" data-route='/signup' onClick={this.props.linkHandler}>Sign Up</button>
        </div>
      </div>
    );
  }
});
