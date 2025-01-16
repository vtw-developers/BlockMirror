var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import * as builtins from "./__builtins__.json" with{ type: "json"};
import * as random from "./random.json" with{ type: "json"};
import * as matplotlib from "./matplotlib.json" with{ type: "json"};
import * as pandas from "./pandas.json" with{ type: "json"};
import * as sklearn from "./sklearn.json" with{ type: "json"};
import * as numpy from "./numpy.json" with{ type: "json"};
export var DefaultSpecs = __assign({}, builtins, random, matplotlib, pandas, sklearn, numpy);
//# sourceMappingURL=index.js.map