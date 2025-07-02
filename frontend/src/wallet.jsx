import React, {useState, useEffect} from 'react'
import axios from "axios"

function Wallet() {
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3000/api/users/wallet', { withCredentials: true })
      .then(res => {
        setWallet(res.data.wallet);
      })
      .catch(err => {
        setError('Failed to load wallet');
        console.log(err);
      });
  }, []);

  if (error) return <div>{error}</div>;
  if (!wallet) return <div>Loading...</div>;

  return (
    <div>
      <h1>Wallet</h1>
      <p>{wallet.totalKeysRecieved}</p>
      <p>{wallet.totalProvisioned}</p>
      <p>{wallet.availableKeys}</p>

      <div>
        <button onClick={() => {
          axios.post('http://localhost:3000/api/auth/logout', {}, {withCredentials: true})
            .then(res => {
              console.log(res);
            })
            .catch(err => {
              setError('Failed to logout');
              console.log(err);
            });
        }}>Logout</button>
      </div>
    </div>
  )
}

export default Wallet;