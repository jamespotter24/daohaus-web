import React, { useState, useContext } from 'react';
import { withRouter } from 'react-router-dom';
import { FormikWizard } from 'formik-wizard';

import { useWeb3Context } from 'web3-react';

import FactoryAbi from '../../contracts/factory.json';

import { post, remove } from '../../util/requests';
import summonSteps from './SummonSteps';
import Loading from '../loading/Loading';

import { Web3Context } from '../../contexts/ContractContexts';

function FormWrapper({
  children,
  isLastStep,
  status,
  goToPreviousStep,
  canGoBack,
  actionLabel,
}) {
  return (
    <div className="Wizard">
      {children}
      {status && <div className="Status">{status.message}</div>}
      <div className="ButtonGroup">
        <button type="button" onClick={goToPreviousStep} disabled={!canGoBack}>
          Previous
        </button>
        <button type="submit">
          {actionLabel || (isLastStep ? 'Summon!' : 'Next step')}
        </button>
      </div>
    </div>
  );
}

const SummonWizard = props => {
  const context = useWeb3Context();
  const [loading, setLoading] = useState(false);
  const [runOnce, setRunOnce] = useState(false);
  const [formError, setformError] = useState('');

  const [web3Service] = useContext(Web3Context);

  const handleSubmit = async values => {
    setLoading(true);

    if (
      parseInt(web3Service.toWei(values.deposit.proposalDeposit)) <
      parseInt(web3Service.toWei(values.deposit.processingReward))
    ) {
      setformError('Deposit must be greater than reward.');
      setLoading(false);
      return false;
    }

    try {
      const cacheMoloch = {
        summonerAddress: context.account,
        name: values.dao.name.trim(),
        minimumTribute: values.currency.minimumTribute,
        description: values.dao.description,
      };
      // cache dao incase of web3 timeout timeout
      const cacheId = await post('moloch/orphan', cacheMoloch);
      console.log('dao cached', cacheId);

      const factoryContract = await web3Service.initContract(
        FactoryAbi,
        process.env.REACT_APP_FACTORY_CONTRACT_ADDRESS,
      );

      await factoryContract.methods
        .newDao(
          values.currency.approvedToken,
          values.timing.periodDuration,
          values.timing.votingPeriodLength,
          values.timing.gracePeriodLength,
          values.timing.abortWindow,
          web3Service.toWei(values.deposit.proposalDeposit),
          values.deposit.dilutionBound,
          web3Service.toWei(values.deposit.processingReward),
          values.dao.name.trim(),
        )
        .send(
          {
            from: context.account,
          },
          function(error, transactionHash) {
            console.log(error, transactionHash);
          },
        )
        .on('error', function(error) {
          setLoading(false);
          if (error.code === 4001) {
            //remove from cache
            remove(`moloch/orphan/${cacheId.data.id}`).then(() => {
              console.log('dao rejected, remove cache');
            });
            setformError(`User Rejected. please try again`);
          } else {
            setformError(`Something went wrong. please try again`);
          }
          console.log('moloch creation error', error);
        })
        .on('transactionHash', function(transactionHash) {
          console.log(transactionHash);
        })
        .on('receipt', function(receipt) {
          console.log(receipt.events.Register); // contains the new contract address
          const contractAddress = receipt.events.Register.returnValues.moloch;
          if (!runOnce) {
            setRunOnce(true); // not working
            const newMoloch = {
              summonerAddress: context.account,
              contractAddress: contractAddress,
              name: values.dao.name.trim(),
              minimumTribute: values.currency.minimumTribute,
              description: values.dao.description,
            };

            post('moloch', newMoloch)
              .then(newMolochRes => {
                //remove from cache and redirect
                remove(`moloch/orphan/${cacheId.data.id}`).then(() => {
                  props.history.push(`/doa/${contractAddress.toLowerCase()}`);
                });
              })
              .catch(err => {
                setLoading(false);
                console.log('moloch creation error', err);
              });
          }
        })
        .on('confirmation', function(confirmationNumber, receipt) {
          console.log(confirmationNumber, receipt);
        })
        .then(function(newContractInstance) {
          console.log(newContractInstance.options.address); // instance with the new contract address
        });
    } catch (err) {
      console.log(err);
      setLoading(false);
      setformError(`Something went wrong. please try again`);
    }
  };

  return (
    <>
      {context.account ? (
        <>
          {!loading ? (
            <>
              {formError && <small style={{ color: 'red' }}>{formError}</small>}
              <FormikWizard
                steps={summonSteps}
                onSubmit={handleSubmit}
                render={FormWrapper}
              />
            </>
          ) : (
            <Loading />
          )}
        </>
      ) : (
        <p>Connect your metamask account</p>
      )}
    </>
  );
};

export default withRouter(SummonWizard);
