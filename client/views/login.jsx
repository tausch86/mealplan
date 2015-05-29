/** @jsx React.DOM */

var Navigation = ReactRouter.Navigation;

var LogIn = React.createClass({

  mixins: [Navigation],
  
  getInitialState: function() {
    return {email: null, password: null, login: true};
  },
  
  handleEmailChange: function(e) {
     this.setState({email: e.target.value});
  },

  handlePasswordChange: function(e) {
     this.setState({password: e.target.value});
  },

  handleLogin: function() {
    var user = new UserModel(this.state);
    var that = this;
    user.save({}, {
      success: function(model, res){
        console.log("SUCCESS!");
        that.transitionTo('mealquery');
      },
      error: function(model, err){
        console.log("ERROR!");
      }
    });
  },

  render : function() {
    return (
      <div>
        <button>Sign Up</button>
        <button>Log In</button>
        <form>
          <input type="text" name="email" placeholder="Email" onChange={this.handleEmailChange} />
          <input type="password" name="password" placeholder="Password" onChange={this.handlePasswordChange}/>
          <button type="button" onClick={this.handleLogin}>Login</button>
        </form>
      </div>
    );
  }

});