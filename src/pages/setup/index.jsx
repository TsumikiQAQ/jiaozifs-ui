import React, {useCallback, useEffect} from "react";
import Layout from "../../lib/components/layout";
import {useState} from "react";
import {API_ENDPOINT, setup, SETUP_STATE_NOT_INITIALIZED, SETUP_STATE_INITIALIZED} from "../../lib/api";
import {useRouter} from "../../lib/hooks/router";
import {useAPI} from "../../lib/hooks/api";
import {SetupComplete} from "./setupComplete";
import {UserConfiguration} from "./userConfiguration";


const SetupContents = () => {
    const [setupError, setSetupError] = useState(null);
    const [setupData, setSetupData] = useState(null);
    const [disabled, setDisabled] = useState(false);
    const [currentStep, setCurrentStep] = useState(null);
    const [commPrefsMissing, setCommPrefsMissing] = useState(false);
    const router = useRouter();
    const { response, error, loading } = useAPI(() => {
        return setup.getState()
    });

    useEffect(() => {
        // Set initial state
        if (!error && response) {
            setCurrentStep(response.state);
            setCommPrefsMissing(response.comm_prefs_missing === true);
        }
    }, [error, response]);

    const onSubmitUserConfiguration = useCallback(async (adminUser, userEmail, checked) => {
        if (currentStep !== SETUP_STATE_NOT_INITIALIZED && !adminUser) {
            setSetupError("Please enter your admin username.");
            return;
        }
        if (commPrefsMissing && !userEmail) {
            setSetupError("Please enter your email address.");
            return;
        }

        setDisabled(true);
        try {
            if (currentStep !== SETUP_STATE_INITIALIZED) {
                const response = await setup.lakeFS(adminUser);
                setSetupData(response);
            }
            if (commPrefsMissing) {
                await setup.commPrefs(userEmail, checked, checked);
                setCommPrefsMissing(false);
            }
            setSetupError(null);
        } catch (error) {
            setSetupError(error);
        } finally {
            setDisabled(false);
        }
    }, [setDisabled, setSetupError, setup, currentStep, commPrefsMissing]);

    if (error || loading) {
        return null;
    }

    if (setupData && setupData.access_key_id) {
        return (
            <Layout logged={false}>
                <SetupComplete
                    accessKeyId={setupData.access_key_id}
                    secretAccessKey={setupData.secret_access_key}
                    apiEndpoint={API_ENDPOINT}
                    />
            </Layout>
        );
    }

    const notInitialized = currentStep !== SETUP_STATE_INITIALIZED;
    if (notInitialized || commPrefsMissing) {
        return (
            <Layout logged={false}>
                <UserConfiguration
                    onSubmit={onSubmitUserConfiguration}
                    setupError={setupError}
                    disabled={disabled}
                    requireAdmin={notInitialized}
                    requireCommPrefs={commPrefsMissing}
                />
            </Layout>
        );
    }

    return router.push({pathname: '/repositories', query: router.query});
};


const SetupPage = () => <SetupContents/>;

export default SetupPage;
