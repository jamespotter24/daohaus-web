import React from 'react';
import { ArrowRightOutlined } from '@ant-design/icons';

import { daoPresets } from '../../content/summon-presets';
import PresetCard from './PresetCard';

import './Summon.scss';

const SummonStepOne = ({ daoData, setDaoData, setCurrentStep }) => {
  const selectPreset = preset => {
    setDaoData(prevState => {
      return { ...prevState, ...preset };
    });
  };

  const renderPresets = () => {
    return daoPresets().map(preset => {
      const isSelected = daoData.presetName === preset.presetName;
      return (
        <PresetCard
          preset={preset}
          isSelected={isSelected}
          selectPreset={selectPreset}
          key={preset.presetName}
        ></PresetCard>
      );
    });
  };
  return (
    <div className="SummonStepOne">
      <p className="Alert">
        Transaction fees got you down? Check our{' '}
        <a href="/help#xDAI">Quick Start Guide</a> on how to switch to xDAI for
        cheaper, faster interactions for your community.
      </p>
      <div className="SummonStepOne__list">{renderPresets()}</div>
      <div className="StepControl">
        <button
          onClick={() => setCurrentStep(2)}
          disabled={!daoData.presetName}
          className={!daoData.presetName ? 'disabled' : ''}
        >
          Continue <ArrowRightOutlined style={{ marginLeft: '5px' }} />
        </button>
      </div>
    </div>
  );
};

export default SummonStepOne;
