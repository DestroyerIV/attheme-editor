import "codemirror/mode/javascript/javascript.js";
import "./styles.scss";

import { allVariables, defaultValues } from "../attheme-variables";
import Button from "../button/component";
import CodeMirror from "../codemirror/component";
import Color from "../color";
import Dialog from "../dialog/component";
import Heading from "../heading/component";
import Hint from "../hint/component";
import Interpreter from "es-interpreter";
import PropTypes from "prop-types";
import React from "react";
import colorClass from "./color-class";
import createTheme from "./theme";
import localization from "../localization";

const STEPS_PER_ONCE = 50000;
const BABEL_OPTIONS = {
  presets: [
    `es2015`,
    `es2016`,
    `es2017`,
  ],
};

let Babel;

window.Color = Color;

class ScriptRunner extends React.Component {
  static propTypes = {
    onClose: PropTypes.func.isRequired,
    theme: PropTypes.object.isRequired,
    onThemeChange: PropTypes.func.isRequired,
  }

  state = {
    parseError: null,
    runtimeError: null,
    isEvaluated: false,
    isEvaluating: false,
    isBabelLoaded: Boolean(Babel),
    isBabelLoading: true,
  };

  componentDidMount = async () => {
    if (Babel) {
      this.setState({
        isBabelLoaded: true,
        isBabelLoading: false,
      });
    } else {
      try {
        Babel = await import(`@babel/standalone`);
      } catch (e) {
        this.setState({
          isBabelLoaded: false,
          isBabelLoading: false,
        });
      }

      this.setState({
        isBabelLoaded: true,
        isBabelLoading: false,
      });
    }
  }

  editor = React.createRef();

  handleRun = () => {
    this.setState({
      isEvaluating: true,
      isEvaluated: false,
    });
    let hasErrors = false;

    let code = this.editor.current.editor.getValue();

    try {
      ({ code } = Babel.transform(code, BABEL_OPTIONS));
    } catch (parseError) {
      this.setState({
        parseError,
        isEvaluating: false,
      });

      hasErrors = true;
    }

    const themeCopy = {
      ...this.props.theme,
      variables: {
        ...this.props.theme.variables,
      },
      palette: [
        ...this.props.theme.palette,
      ],
    };

    const activeTheme = createTheme(themeCopy);

    const prepare = (interpreter, scope) => {
      const log = (...messageParts) => {
        // eslint-disable-next-line no-console
        console.log(
          localization.scriptRunner_logMessage(),
          ...messageParts.map((part) => interpreter.pseudoToNative(part))
        );
      };

      window.script = interpreter;

      interpreter.setProperty(
        scope,
        `editor`,
        scope,
        Interpreter.READONLY_DESCRIPTOR,
      );

      interpreter.setProperty(
        scope,
        `activeTheme`,
        interpreter.nativeToPseudo(activeTheme),
      );
      interpreter.setProperty(
        scope,
        `Color`,
        interpreter.nativeToPseudo(colorClass),
      );
      interpreter.setProperty(
        scope,
        `log`,
        interpreter.createNativeFunction(log),
      );
      interpreter.setProperty(
        scope,
        `allVariablesList`,
        interpreter.nativeToPseudo(allVariables),
      );
      interpreter.setProperty(
        scope,
        `allVariablesDefaultValues`,
        interpreter.nativeToPseudo(defaultValues),
      );
    };

    let script;

    try {
      script = new Interpreter(code, prepare);
    } catch (parseError) {
      this.setState({
        parseError,
        isEvaluating: false,
      });

      hasErrors = true;
    }

    if (!hasErrors) {
      const nextStep = () => {
        let shouldContinue;

        try {
          for (let i = 0; i < STEPS_PER_ONCE; i++) {
            shouldContinue = script.step();

            if (!shouldContinue) {
              break;
            }
          }
        } catch (runtimeError) {
          shouldContinue = false;
          hasErrors = true;

          this.setState({
            runtimeError,
            isEvaluating: false,
          });
        }

        if (!hasErrors) {
          if (shouldContinue) {
            setTimeout(nextStep);
          } else {
            this.setState({
              isEvaluating: false,
              isEvaluated: true,
            });

            this.props.onThemeChange(themeCopy);
          }
        }
      };

      nextStep();
    }
  }

  render () {
    let outputTitle;
    let output;
    let outputClassName = `scriptRunner_output`;

    if (this.state.isEvaluating) {
      outputTitle = localization.scriptRunner_isEvaluating();
    } else if (this.state.isEvaluated) {
      outputTitle = localization.scriptRunner_isEvaluated();
      outputClassName += ` -success`;
    } else if (this.state.runtimeError) {
      outputTitle = localization.scriptRunner_runtimeError();
      output = this.state.runtimeError.message;
      outputClassName += ` -error`;
    } else if (this.state.parseError) {
      outputTitle = localization.scriptRunner_syntaxError();
      output = this.state.parseError.message;
      outputClassName += ` -error`;
    } else if (!this.state.isBabelLoaded && !this.state.isBabelLoading) {
      outputTitle = localization.scriptRunner_babelLoadingFailed();
      outputClassName += ` -error`;
    }

    return (
      <Dialog
        onDismiss={this.props.onClose}
        title={localization.scriptRunner_title()}
        buttons={
          <React.Fragment>
            <Button
              onClick={this.handleRun}
              isDisabled={!this.state.isBabelLoaded || this.state.isEvaluating}
            >
              {localization.scriptRunner_run()}
            </Button>
            <Button onClick={this.props.onClose}>
              {localization.scriptRunner_close()}
            </Button>
          </React.Fragment>
        }
      >
        <Hint>{localization.scriptRunner_description()}</Hint>
        <CodeMirror
          className="scriptRunner_editor"
          value=""
          lineNumbers={true}
          autofocus={true}
          mode="javascript"
          ref={this.editor}
          indentUnit={2}
          indentWithTabs={false}
          tabSize={2}
        />
        {
          outputTitle
            ? (
              <div className={outputClassName}>
                <Heading level={3} className="scriptRunner_outputTitle">
                  {outputTitle}
                </Heading>
                {
                  output
                    ? <p>{output}</p>
                    : null
                }
              </div>
            )
            : null
        }
      </Dialog>
    );
  }
}

export default ScriptRunner;