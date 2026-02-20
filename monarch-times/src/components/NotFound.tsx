import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full bg-inherit text-black dark:text-white font-mono p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div 
          className="text-9xl font-bold mb-4 tracking-tighter"
          animate={{ textShadow: ["2px 2px 0px #ff0000", "-2px -2px 0px #0000ff", "0px 0px 0px #000000"] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
        >
          404
        </motion.div>
        <h1 className="text-2xl md:text-4xl mb-6 uppercase tracking-wider">
          Signal Undetected
        </h1>
        <p className="text-neutral-500 mb-8 max-w-md mx-auto">
          The node you are trying to reach does not exist on this network or has been encrypted.
        </p>
        
        <Link to="/">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-none border border-black dark:border-white hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-white transition-colors duration-200"
          >
            Return to Town Square
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
