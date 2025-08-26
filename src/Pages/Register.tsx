// src/Pages/Register/Register.tsx
import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import styles from './Register.module.css';
import fondoRegister from '../assets/Register.jpg'; // O una imagen de fondo diferente si la tienes

const Register: React.FC = () => {
  // Obtiene el tipo de TDAH del store
  const tdahType = useAppStore((s) => s.tdahType);
  
  // Estados para los campos del formulario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue
    
    console.log('Datos del registro:', {
      tdahType: tdahType,
      name: name,
      email: email,
      password: password,
    });
    
    // Aquí iría la lógica para enviar los datos a tu base de datos o API
    // Por ahora, solo los mostramos en la consola.
  };

  return (
    <div className={styles.screen} style={{ backgroundImage: `url(${fondoRegister})` }}>
      <main className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h1 className={styles.title}>Registro</h1>
          
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>Nombre:</label>
            <input 
              type="text" 
              id="name" 
              className={styles.input} 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email:</label>
            <input 
              type="email" 
              id="email" 
              className={styles.input} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña:</label>
            <input 
              type="password" 
              id="password" 
              className={styles.input} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.tdahTypeDisplay}>
            Tu tipo de TDAH es: **{tdahType || 'No seleccionado'}**
          </div>

          <button type="submit" className={styles.btn}>
            Iniciar mi aventura!
          </button>
        </form>
      </main>
    </div>
  );
};

export default Register;