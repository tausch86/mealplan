/** @jsx React.DOM */

var Recipe = React.createClass({

  getInitialState: function(){
    return { forReview: true };
  },

  componentWillMount: function(){
    this.setState({ forReview: this.props.forReview || this.state.forReview });
  },

  _navigateToRecipe: function(){
    window.open(this.props.recipe.get('recipeUrl'));
  },

  render : function() {
    var imgUrl = this.props.recipe.get('smallImageUrls')[0];
    var bgStyle = {
      backgroundImage: 'url(' + imgUrl + ')',
      backgroundSize: 'cover',
      height: '250px'
    };

    return (
      <div className="recipeContainer col-md-2" style={bgStyle} key={this.props.recipe}>
        <div id={this.state.forReview ? 'show' : 'hide'} >
          <button type='button' onClick={this._navigateToRecipe}>View</button>
          <button type='button' data-position={this.props.position} data-collection={this.props.collection} onClick={this.props.rejectRecipe}>Reject</button>
        </div>
        <div className="recipe recipeName">{this.props.recipe.get('recipeName')}</div>
      </div>
    );
  }
});