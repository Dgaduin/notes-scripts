import htm from 'https://unpkg.com/htm?module';
import { h, render, Component, Fragment, createRef } from 'https://unpkg.com/preact?module';
import Router from 'https://unpkg.com/preact-router?module';

const html = htm.bind(h);
const { createHashHistory } = History;

const index = new FlexSearch();
let metadata;

const fetchIndex = async () => {
  const url = 'https://notes-cdn.dgaduin.dev/searchIndex.json';
  const data = await (await fetch(url)).text();
  return data;
}
const fetchMetadata = async () => {
  const url = 'https://notes-cdn.dgaduin.dev/metadata.json';
  const data = await (await fetch(url)).json();
  return data;
}

const CustomScrollContainer = (props) =>
  html`<div  ...${{ ...props, "data-simplebar": true, "data-simplebar-auto-hide": "false" }} />`;

const CustomScrollContainerUL = (props) =>
  html`<ul  ...${{ ...props, "data-simplebar": true, "data-simplebar-auto-hide": "false" }} />`;

class Note extends Component {
  async setHtml(id) {
    const html = await fetch(` https://notes-cdn.dgaduin.dev/notes/${id}.html `).then(res => res.text());
    this.setState({ html });
  }

  async componentDidMount() {
    this.setHtml(this.props.id);
  }

  async componentDidUpdate(nextProps) {
    if (nextProps.id != this.props.id) {
      this.setHtml(this.props.id);
    }
  }

  render() {
    let page = this.state.html;
    if (this.props.query && page) {
      const keyword = this.props.query;
      const content = page;

      const sanitizedKeyword = keyword.replace(/\W/g, '');

      const regexForContent = new RegExp(`(${sanitizedKeyword})(?!\"\>)`, 'gi');

      page = content.replace(regexForContent, '<mark>$&</mark>');
    }
    const internalProps = {
      dangerouslySetInnerHTML: { __html: page }
    };
    return html`<${CustomScrollContainer} id="main">
                        <article ...${internalProps}/>
                    <//>`;
  }
}

class SearchResults extends Component {
  constructor() {
    super();
    this.state = { results: [] };
  }

  async componentDidMount() {
    const results = await index.search({ query: this.props.query, suggest: true });
    this.setState({ results });
  }

  async componentDidUpdate(nextProps) {
    if (nextProps.query != this.props.query) {
      const results = await index.search({ query: this.props.query, suggest: true });
      this.setState({ results });
    }
  }

  render() {
    const list = this.state.results.map(result => {
      const note = metadata.notes.find(x => x.name == result)
      return html`<li><a href="#/note/${result}/${this.props.query}">${note.title}</a></li>`;
    });
    return html`
            <${CustomScrollContainer} id="main">
                <h1>Search results for "${this.props.query}"</h1>
                <ul id="searchResults">${list}</ul>
            <//>`
  }
}

class Sidebar extends Component {

  constructor() {
    super();
    this.state = { notes: [], filteredNotes: [], filter: "'" };
  }

  async componentDidMount() {
    const notes = this.props.metadata;
    this.setState({ notes, filteredNotes: notes });
  }

  async componentDidUpdate() { }

  filter = (e) => {
    let regex = new RegExp(`${e.target.value}`, 'gi');
    let notes = this.state.notes.filter(x => x.title.match(regex));
    this.setState({ filteredNotes: notes });
  }


  render() {
    const { filteredNotes } = this.state;

    const notes = filteredNotes.map(note => {
      const { fileName, title } = note;
      return html` 
                <li>
                    <a href="#/note/${fileName}">${title}</a> 
                </li>`;
    });

    return html`
        <nav id="sidebar">
            <header>
                <h2>
                    <a href="/">Notes</a>                     
                </h2>                 
                <input type="text" id="title-search-box" placeholder="Search in note titles" onInput=${this.filter}/>
            </header>
            <${CustomScrollContainer} id="noteList">
                <ul>
                    ${notes}
                </ul>
            <//>
        </nav> `;
  }
}

const Home = () =>
  html`<div id="main" data-simplebar data-simplebar-auto-hide="false">
                <h1>Welcome</h1>
                <p>These are my notes</p>
                <p>Source and build steps can be found at <a href="https://github.com/Dgaduin/note-scripts">GitHub</a></p>
                <p>
                    <a href="https://app.netlify.com/sites/notes-dgaduin/deploys" rel="nofollow">
                        <img src="https://camo.githubusercontent.com/a060d3a8d7d75179c23fb1d0da8958a4221046f7/68747470733a2f2f6170692e6e65746c6966792e636f6d2f6170692f76312f6261646765732f36663839636564302d633335352d343539342d623338622d3233363135653737313665322f6465706c6f792d737461747573" alt="Netlify Status" data-canonical-src="https://api.netlify.com/api/v1/badges/6f89ced0-c355-4594-b38b-23615e7716e2/deploy-status" style="max-width:100%;"></img>
                    </a>
                </p>
        </div > `;


const App = (metadata) => {
  const routerProps = { history: createHashHistory() };

  return html`
        <${Fragment}>            
            <${Router} ...${routerProps} >
                <${Home} ...${{ default: true }} /> 
                <${Note} ...${{ path: "/note/:id/:query?" }}/>
                <${SearchResults} ...${{ path: "/search/:query" }} />              
            <//>     
            <${Sidebar} ...${metadata} />        
        <//>
    `;
};

let indexPromise = fetchIndex()
  .then(searchIndex => {
    index.import(searchIndex);
  })
  .then(fetchMetadata)
  .then((data) => {
    metadata = data;
    render(
      html`<${App} ...${{ metadata: data }}/>`,
      document.body)
  });