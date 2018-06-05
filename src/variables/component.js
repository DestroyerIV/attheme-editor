import "./styles.scss";

import { allVariables, defaultValues } from "../attheme-variables";
import Color from "../color";
import FuzzySearch from "fuzzy-search";
import PropTypes from "prop-types";
import React from "react";
import Variable from "../variable/component";

class Variables extends React.Component {
  static propTypes = {
    themeId: PropTypes.number.isRequired,
    theme: PropTypes.object.isRequired,
    wallpaper: PropTypes.string,
    onClick: PropTypes.func.isRequired,
    onNewVariable: PropTypes.func.isRequired,
    displayAll: PropTypes.bool.isRequired,
    searchQuery: PropTypes.string,
  };

  shouldComponentUpdate = (newProps) => (
    newProps.theme !== this.props.theme
    || newProps.displayAll !== this.props.displayAll
    || newProps.searchQuery !== this.props.searchQuery
    || newProps.wallpaper !== this.props.wallpaper
    || newProps.onClick !== this.props.onClick
    || newProps.onNewVariable !== this.props.onNewVariable
  );

  render () {
    const themeVariables = Object.keys(this.props.theme);

    let variablesOrder = [];

    if (this.props.displayAll) {
      for (const variableName of allVariables) {
        if (variableName === `chat_wallpaper` && this.props.wallpaper) {
          continue;
        }

        if (!this.props.theme[variableName]) {
          variablesOrder.push(variableName);
        }
      }
    }

    if (this.props.wallpaper && !this.props.theme.chat_wallpaper) {
      if (!themeVariables.includes(`chat_wallpaper`)) {
        variablesOrder.push(`chat_wallpaper`);
      }
    }

    variablesOrder.push(...themeVariables);

    if (this.props.searchQuery && this.props.searchQuery !== `*`) {
      let variablesOrderFS = [];

      const searcher = new FuzzySearch(variablesOrder, [], {
        sort: true,
      });

      variablesOrderFS = searcher.search(this.props.searchQuery);

      for (const variable of variablesOrder) {
        if (variablesOrderFS.includes(variable)) {
          continue;
        }

        const search = Color.parseHex(this.props.searchQuery)
          ? Color.hex(Color.parseHex(this.props.searchQuery))
          : this.props.searchQuery;

        if (themeVariables.includes(variable)
          && this.props.theme[variable]
          && Color.hex(this.props.theme[variable]).startsWith(search)) {
          variablesOrderFS.push(variable);
        } else if (defaultValues[variable]
          && Color.hex(defaultValues[variable]).startsWith(search)) {
          variablesOrderFS.push(variable);
        }
        variablesOrder = variablesOrderFS;
      }
    }

    const variables = [];

    for (const variableName of variablesOrder) {
      let variableElement;

      if (variableName === `chat_wallpaper` && this.props.wallpaper) {
        variableElement = <Variable
          variableName="chat_wallpaper"
          key="chat_wallpaper"
          wallpaper={this.props.wallpaper}
          onClick={this.props.onClick}
        />;
      } else if (themeVariables.includes(variableName)) {
        variableElement = <Variable
          variableName={variableName}
          key={variableName}
          color={this.props.theme[variableName]}
          onClick={this.props.onClick}
        />;
      } else {
        variableElement = <Variable
          variableName={variableName}
          key={variableName}
          color={defaultValues[variableName]}
          onClick={this.props.onNewVariable}
          isUnadded={true}
        />;
      }

      variables.push(variableElement);
    }

    return <div className="variables">{variables}</div>;
  }
}

export default Variables;