// components/Popup.tsx
import React from 'react';
import styles from '../src/styles/Upload.module.css';

interface PopupProps {
  show: boolean;
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ show, onClose }) => {
    const [inputValue, setInputValue] = React.useState<string>('');

    if (!show) {
        return null;
    }

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = async () => {
    console.log('Submitted value', inputValue)

    // send text to api
    try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ input: inputValue }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const result = await response.json() as { message: string };
        console.log('Success:', result);
        // popup
        alert(result.message);
      } catch (error) {
        console.error('Error:', error);
      }


    // onClose()
  }

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupContent}>
        <button className={styles.closeButton} onClick={onClose}>Close</button>
        <h2>Upload a challenge!</h2>
        <p>Please upload one challenge link on each line.</p>
        <textarea className={styles.inputText}
          name="input"
          id="inputText"
          value={inputValue}
          onChange={handleInputChange}
        />
        <br/>
        <button className={styles.submitButton} onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
};

export default Popup;
