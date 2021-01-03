import {createSandbox, SinonStub} from "sinon";
import {LogHelper} from "../../src/utils/LogHelper";
import * as log4js from "log4js";
import {expect} from "chai";

describe('LogHelper', function () {
    const sandbox = createSandbox();
    let log4JsConfigureStub: SinonStub<any[], any>;
    let config: { [p: string]: any } = {
        internals: {
            log_level: 'trace',
        }
    };

    beforeEach(function () {
        log4JsConfigureStub = sandbox.stub(log4js, "configure");
    })

    afterEach(function () {
        sandbox.restore();
    });

    it("Calls configure", function () {
        LogHelper.configure(config);
        expect(log4JsConfigureStub.callCount).eq(1);
    });
});