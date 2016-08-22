class App extends React.Component {
  componentWillMount() {
    this.ws = new WebSocket('ws://localhost:4321/stream')
    this.ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      console.log(data)
      this.setState(data)
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => {this.setState({user: "Unknown"})}, 1000)
    }
  }

  constructor(props) {
    super(props);
    this.state = {
      weight: 0,
      user: "Unknown"
    }
  }

  render() {
    if (this.state.user == "Unknown" && this.state.weight < 50) {
      return (
        <h2>
          <span className="no-user">Please have a seat</span>
        </h2>
      )
    }
    else {
      return (
        <h2>
          <span className="hello">Hello </span>
          <span className="user">{this.state.user}</span>
        </h2>
      )
    }
  }
}

const domNode = document.getElementById("app")
ReactDOM.render(<App/>, domNode)
