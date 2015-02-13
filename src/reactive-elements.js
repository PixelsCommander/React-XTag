React = typeof React === 'object' ? React : require('react');

(function (w) {
    var PROPERTY_DELIMITER_CHARACTERS = [':', '-', '_'];

    if (document.registerElement || document.register) {
        var registrationFunction = (document.registerElement || document.register).bind(document);
    }

    var registerReact = function (elementName, reactClass) {
        var elementPrototype = Object.create(HTMLElement.prototype);

        elementPrototype.createdCallback = function () {
            this._content = utils.getContentNodes(this);
            var reactElement = React.createElement(reactClass, utils.getAllProperties(this, this.attributes));

            //Since React v0.12 API was changed, so need a check for current API
            this.reactiveElement = React.render(reactElement, this);

            utils.extend(this, this.reactiveElement);

            utils.getterSetter(this, 'props', function () {
                return this.reactiveElement.props;
            }, function (value) {
                this.reactiveElement.setProps(value);
            });
        };

        elementPrototype.attributeChangedCallback = function (name, oldValue, newValue) {
            this.reactiveElement.props = utils.getAllProperties(this, this.attributes);
            this.reactiveElement.forceUpdate();
            if (this.reactiveElement.attributeChanged !== undefined) {
                this.reactiveElement.attributeChanged.bind(this)(name, oldValue, newValue);
            }
        }

        registrationFunction(elementName, {
            prototype: elementPrototype
        });
    };

    var utils = {
        extend: function (extandable, extending) {
            for (var i in extending) {
                if (!(i in extandable)) {
                    if (typeof extending[i] === 'function') {
                        extandable[i] = extending[i].bind(extending);
                    } else {
                        extandable[i] = extending[i];
                    }
                }
            }
        },
        getContentNodes: function (el) {
            var fragment = document.createElement('content');
            while(el.childNodes.length) {
                fragment.appendChild(el.childNodes[0]);
            }
            return fragment;
        },
        getAllProperties: function (el, attributes) {
            var result = {};

            for (var i = 0; i < attributes.length; i++) {
                var attribute = attributes[i];
                var propertyName = utils.attributeNameToPropertyName(attribute.name);
                result[propertyName] = utils.parseAttributeValue(attributes[i].value);
            }

            result._content = el._content;
            return result;
        },
        attributeNameToPropertyName: function (attributeName) {
            var result = attributeName.replace(/^x\-|^data\-/i, '');
            var delimiterIndex = -1;

            while ((delimiterIndex = utils.getNextDelimiterIndex(result)) !== -1) {
                result = result.slice(0, delimiterIndex) + result.charAt(delimiterIndex + 1).toUpperCase() + result.slice(delimiterIndex + 2, result.length);
            }

            return result;
        },
        getNextDelimiterIndex: function (string) {
            var result = -1;

            for (var i = 0; i < PROPERTY_DELIMITER_CHARACTERS.length; i++) {
                var char = PROPERTY_DELIMITER_CHARACTERS[i];
                result = string.indexOf(char);
                if (result !== -1) {
                    break;
                }
            }

            return result;
        },
        parseAttributeValue: function (value) {
            var pointerRegexp = /\{.*?\}/g,
                jsonRegexp = /\{{.*?\}}/g,
                jsonArrayRegexp = /\{{.*?\}}/g;

            var pointerMatches = value.match(pointerRegexp),
                jsonMatches = value.match(jsonRegexp) || value.match(jsonArrayRegexp);

            if (jsonMatches && jsonMatches.length > 0) {
                jsonMatches[0] = jsonMatches[0].substring(1, jsonMatches[0].length - 1).replace(/'/g, '"');
                value = JSON.parse(jsonMatches[0]);
            } else if (pointerMatches && pointerMatches.length > 0) {
                value = eval(pointerMatches[0].replace('{', '').replace('}', ''));
            }

            return value;
        },
        getterSetter: function (variableParent, variableName, getterFunction, setterFunction) {
            if (Object.defineProperty) {
                Object.defineProperty(variableParent, variableName, {
                    get: getterFunction,
                    set: setterFunction
                });
            }
            else if (document.__defineGetter__) {
                variableParent.__defineGetter__(variableName, getterFunction);
                variableParent.__defineSetter__(variableName, setterFunction);
            }

            variableParent["get" + variableName] = getterFunction;
            variableParent["set" + variableName] = setterFunction;
        }
    };

    window.ReactiveElements = {};
    window.ReactiveElements.utils = utils;
    document.registerReact = registerReact;

    if (typeof module === 'object' && module.exports) {
        module.exports = registerReact;
    }

    if (w.xtag !== undefined) {
        w.xtag.registerReact = registerReact;
    }
})(window);
